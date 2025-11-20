-- Update existing social posts to add week '2025-W47'
UPDATE social_posts 
SET week = '2025-W47' 
WHERE week IS NULL;