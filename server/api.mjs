import http from 'node:http';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.API_PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[api] Missing env vars. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Allowed origins - configure these for your production domains
const ALLOWED_ORIGINS = [
  'https://flipd.online',
  'https://www.flipd.online',
  'http://localhost:3000',
  'http://localhost:5173',
];

const getCorsHeaders = (origin) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
};

const sendJson = (res, statusCode, body, origin) => {
  const headers = getCorsHeaders(origin);
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const origin = req.headers?.origin;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      const headers = getCorsHeaders(origin);
      res.writeHead(204, headers);
      res.end();
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const body = await readJsonBody(req);
      const { fileName, fileType, fileBase64, config } = body || {};

      if (!fileName || !fileBase64) {
        return sendJson(res, 400, { error: 'Missing fileName or fileBase64' }, origin);
      }

      // File size validation (max 50MB)
      const MAX_FILE_SIZE_MB = 50;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
      const fileSizeBytes = Buffer.byteLength(fileBase64, 'base64');
      
      if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
        return sendJson(res, 413, { 
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` 
        }, origin);
      }

      // PDF content type validation
      const allowedTypes = ['application/pdf', 'pdf'];
      const isValidType = allowedTypes.some(type => 
        fileType?.toLowerCase().includes(type) || fileName.toLowerCase().endsWith('.pdf')
      );
      
      if (!isValidType) {
        return sendJson(res, 415, { error: 'Only PDF files are allowed' }, origin);
      }

      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const id = randomUUID().replace(/-/g, '');
      const filePath = `${id}/${safeName}`;
      const fileBuffer = Buffer.from(fileBase64, 'base64');

      const { error: uploadError } = await supabase.storage.from('PDFs').upload(filePath, fileBuffer, {
        contentType: fileType || 'application/pdf',
        upsert: false,
      });

      if (uploadError) {
        return sendJson(res, 500, { error: `Storage upload failed: ${uploadError.message}` }, origin);
      }

      const { data: publicUrl } = supabase.storage.from('PDFs').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('flipbooks').insert([
        {
          id,
          file_path: filePath,
          file_name: safeName,
          config: {
            flipSpeed: config?.flipSpeed,
            shadowIntensity: config?.shadowIntensity,
            useSound: config?.useSound,
          },
        },
      ]);

      if (dbError) {
        return sendJson(res, 500, { error: `Database insert failed: ${dbError.message}` }, origin);
      }

      return sendJson(res, 200, { id, url: publicUrl.publicUrl }, origin);
    }

    if (req.method === 'GET' && url.pathname === '/api/flipbook') {
      const id = (url.searchParams.get('id') || '').trim();
      if (!id) {
        return sendJson(res, 400, { error: 'Missing id query param' }, origin);
      }
      
      // Validate ID format (alphanumeric only, max 50 chars)
      const idRegex = /^[a-zA-Z0-9_-]{1,50}$/;
      if (!idRegex.test(id)) {
        return sendJson(res, 400, { error: 'Invalid ID format' }, origin);
      }

      const { data, error } = await supabase
        .from('flipbooks')
        .select('file_path,file_name,config')
        .eq('id', id)
        .single();

      if (error || !data) {
        return sendJson(res, 404, { error: 'Flipbook not found' }, origin);
      }

      const { data: publicUrl } = supabase.storage.from('PDFs').getPublicUrl(data.file_path);

      return sendJson(res, 200, {
        url: publicUrl.publicUrl,
        fileName: data.file_name,
        config: data.config,
      }, origin);
    }

    return sendJson(res, 404, { error: 'Not found' }, origin);
  } catch (error) {
    return sendJson(res, 500, { error: error?.message || 'Unexpected backend error' }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
