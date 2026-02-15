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

export async function uploadPDF(file: File, config: Config): Promise<{ id: string; url: string } | null> {
  try {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const filePath = `${id}/${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('PDFs')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
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
      return null;
    }
    
    return { id, url: publicUrl.publicUrl };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return null;
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
