import { createClient } from '@supabase/supabase-js';
import { Config } from '../types';

const supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 'https://gulpdfocmnoqhutcqoqp.supabase.co';
const supabaseKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_JfI_2GV1ao3rSelpm2MeUw_Vgka02Zf';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'flipbook-app',
    },
  },
});

export interface FlipbookRecord {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
  config?: Config;
}

export type UploadResult = 
  | { success: true; id: string; url: string }
  | { success: false; error: string; stage?: 'storage' | 'database' | 'unknown' };

export async function uploadPDF(file: File, config: Config): Promise<UploadResult> {
  try {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const filePath = `${id}/${file.name}`;
    
    // Convert File to ArrayBuffer for more reliable upload on mobile
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    
    const { error: uploadError } = await supabase.storage
      .from('PDFs')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { 
        success: false, 
        error: `Storage: ${uploadError.message}`, 
        stage: 'storage' 
      };
    }
    
    const { data: publicUrl } = supabase.storage
      .from('PDFs')
      .getPublicUrl(filePath);
    
    const { error: dbError } = await supabase
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
      ]);
    
    if (dbError) {
      console.error('Database error:', dbError);
      return { 
        success: false, 
        error: `Database: ${dbError.message}`, 
        stage: 'database' 
      };
    }
    
    return { success: true, id, url: publicUrl.publicUrl };
  } catch (error: any) {
    console.error('Error uploading PDF:', error);
    return { 
      success: false, 
      error: error?.message || 'Unknown error', 
      stage: 'unknown' 
    };
  }
}

export async function getPDF(id: string): Promise<{ url: string; fileName: string; config?: Partial<Config> } | null> {
  try {
    const { data, error } = await supabase
      .from('flipbooks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching flipbook:', error);
      return null;
    }
    
    const { data: publicUrl } = supabase.storage
      .from('PDFs')
      .getPublicUrl(data.file_path);
    
    return { url: publicUrl.publicUrl, fileName: data.file_name, config: data.config };
  } catch (error) {
    console.error('Error getting PDF:', error);
    return null;
  }
}
