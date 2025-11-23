import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a daily summary card image to Supabase Storage
 * @param date - The date in YYYY-MM-DD format
 * @param file - The image file (Blob or ArrayBuffer)
 * @returns The public URL of the uploaded image
 */
export async function saveDailySummaryCard(
  date: string,
  file: Blob | ArrayBuffer
): Promise<string> {
  const fileName = `daily-summary-${date}.png`;
  const filePath = fileName;

  // Convert ArrayBuffer to Blob if needed
  const blob = file instanceof ArrayBuffer ? new Blob([file], { type: 'image/png' }) : file;

  // Upload to storage (will overwrite if exists)
  const { error: uploadError } = await supabase.storage
    .from('social_cards')
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: true, // Overwrite if exists
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('social_cards')
    .getPublicUrl(filePath);

  return publicUrl;
}
