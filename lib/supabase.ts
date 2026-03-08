import { createClient } from '@supabase/supabase-js';
import { Config } from '../types';

const supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 'https://gulpdfocmnoqhutcqoqp.supabase.co';
const supabaseKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_JfI_2GV1ao3rSelpm2MeUw_Vgka02Zf';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    // Step 1: Generate ID and prepare all data upfront (synchronous)
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const filePath = `${id}/${file.name}`;
    
    // Prepare DB record while upload is in progress (parallel preparation)
    const dbRecord = {
      id,
      file_path: filePath,
      file_name: file.name,
      config: {
        flipSpeed: config.flipSpeed,
        shadowIntensity: config.shadowIntensity,
        useSound: config.useSound,
      },
    };
    
    // Step 2: Start storage upload immediately
    const uploadPromise = supabase.storage
      .from('PDFs')
      .upload(filePath, file);
    
    // Step 3: Wait for upload to complete
    const { error: uploadError } = await uploadPromise;
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { 
        success: false, 
        error: `Storage: ${uploadError.message}`, 
        stage: 'storage' 
      };
    }
    
    // Step 4: Insert to database (DB record was prepared while upload was running)
    const { error: dbError } = await supabase
      .from('flipbooks')
      .insert([dbRecord]);
    
    if (dbError) {
      console.error('Database error:', dbError);
      return { 
        success: false, 
        error: `Database: ${dbError.message}`, 
        stage: 'database' 
      };
    }
    
    // Step 5: Get public URL (can be constructed deterministically, but using API for safety)
    const { data: publicUrl } = supabase.storage
      .from('PDFs')
      .getPublicUrl(filePath);
    
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
