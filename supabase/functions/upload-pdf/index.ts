// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
