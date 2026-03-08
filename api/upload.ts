const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Allowed origins - configure these for your production domains
const ALLOWED_ORIGINS = [
  'https://flipd.online',
  'https://www.flipd.online',
  'http://localhost:3000',
  'http://localhost:5173',
];

const getCorsHeaders = (origin: string | undefined) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
};

const json = (res: any, status: number, body: Record<string, any>, origin?: string) => {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).json(body);
};

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin;
  
  if (req.method === 'OPTIONS') {
    const headers = getCorsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, {
      error: 'Missing backend env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    }, origin);
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { fileName, fileType, fileBase64, config } = body || {};

    if (!fileName || !fileBase64) {
      return json(res, 400, { error: 'Missing fileName or fileBase64' }, origin);
    }

    // File size validation (max 50MB)
    const MAX_FILE_SIZE_MB = 50;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const fileSizeBytes = Buffer.byteLength(fileBase64, 'base64');
    
    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      return json(res, 413, { 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` 
      }, origin);
    }

    // PDF content type validation
    const allowedTypes = ['application/pdf', 'pdf'];
    const isValidType = allowedTypes.some(type => 
      fileType?.toLowerCase().includes(type) || fileName.toLowerCase().endsWith('.pdf')
    );
    
    if (!isValidType) {
      return json(res, 415, { error: 'Only PDF files are allowed' }, origin);
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
    const filePath = `${id}/${safeName}`;
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('PDFs')
      .upload(filePath, fileBuffer, {
        contentType: fileType || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return json(res, 500, { error: `Storage upload failed: ${uploadError.message}` }, origin);
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
      return json(res, 500, { error: `Database insert failed: ${dbError.message}` }, origin);
    }

    return json(res, 200, { id, url: publicUrl.publicUrl }, origin);
  } catch (error: any) {
    return json(res, 500, { error: error?.message || 'Unexpected backend error' }, origin);
  }
}
