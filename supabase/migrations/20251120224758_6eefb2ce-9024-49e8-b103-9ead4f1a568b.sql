-- Update social_posts status constraint to include 'failed' status
ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;

ALTER TABLE public.social_posts
ADD CONSTRAINT social_posts_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'sent'::text, 'failed'::text]));