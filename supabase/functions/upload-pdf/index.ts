// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

// Allowed origins - configure these for your production domains
const ALLOWED_ORIGINS = [
  'https://flipd.online',
  'https://www.flipd.online',
  'http://localhost:3000',
  'http://localhost:5173',
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key (has admin privileges)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const configStr = formData.get('config') as string
    const config = JSON.parse(configStr)

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // File size validation (max 50MB)
    const MAX_FILE_SIZE_MB = 50
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413 }
      )
    }
    
    // PDF content type validation
    const allowedTypes = ['application/pdf', 'pdf']
    const isValidType = allowedTypes.some(type => 
      file.type?.toLowerCase().includes(type) || file.name.toLowerCase().endsWith('.pdf')
    )
    
    if (!isValidType) {
      return new Response(
        JSON.stringify({ error: 'Only PDF files are allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 415 }
      )
    }

    // Generate unique ID
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const filePath = `${id}/${file.name}`

    // Upload to Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('PDFs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Storage: ${uploadError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrl } = supabaseClient.storage
      .from('PDFs')
      .getPublicUrl(filePath)

    // Insert into database
    const { error: dbError } = await supabaseClient
      .from('flipbooks')
      .insert([
        {
          id,
          file_path: filePath,
          file_name: file.name,
          config: {
            flipSpeed: config.flipSpeed,
            shadowIntensity: config.shadowIntensity,
            useSound: config.useSound,
          },
        }
      ])

    if (dbError) {
      return new Response(
        JSON.stringify({ error: `Database: ${dbError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ id, url: publicUrl.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
