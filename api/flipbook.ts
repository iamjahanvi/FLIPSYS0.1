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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (req.method !== 'GET') {
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

    const id = String(req.query?.id || '').trim();
    if (!id) {
      return json(res, 400, { error: 'Missing id query param' }, origin);
    }
    
    // Validate ID format (alphanumeric only, max 50 chars)
    const idRegex = /^[a-zA-Z0-9_-]{1,50}$/;
    if (!idRegex.test(id)) {
      return json(res, 400, { error: 'Invalid ID format' }, origin);
    }

    const { data, error } = await supabase
      .from('flipbooks')
      .select('file_path,file_name,config')
      .eq('id', id)
      .single();

    if (error || !data) {
      return json(res, 404, { error: 'Flipbook not found' }, origin);
    }

    const { data: publicUrl } = supabase.storage.from('PDFs').getPublicUrl(data.file_path);

    return json(res, 200, {
      url: publicUrl.publicUrl,
      fileName: data.file_name,
      config: data.config,
    }, origin);
  } catch (error: any) {
    return json(res, 500, { error: error?.message || 'Unexpected backend error' }, origin);
  }
}
