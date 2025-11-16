-- Add missing columns to social_posts table for LinkedIn approval system
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS week text,
ADD COLUMN IF NOT EXISTS image_path text,
ADD COLUMN IF NOT EXISTS linkedin_post_id text,
ADD COLUMN IF NOT EXISTS error_message text;

-- Add index for faster week-based queries
CREATE INDEX IF NOT EXISTS idx_social_posts_week ON public.social_posts(week);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);