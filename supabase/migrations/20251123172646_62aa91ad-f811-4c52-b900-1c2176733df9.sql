-- Add summary_date column for daily summary posts
ALTER TABLE public.social_posts
ADD COLUMN summary_date date;

-- Create storage bucket for social cards
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social_cards',
  'social_cards',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- RLS policies for social_cards bucket
CREATE POLICY "Public read access for social cards"
ON storage.objects
FOR SELECT
USING (bucket_id = 'social_cards');

CREATE POLICY "Service role can upload social cards"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'social_cards' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can update social cards"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'social_cards' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can delete social cards"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'social_cards' AND
  auth.role() = 'service_role'
);