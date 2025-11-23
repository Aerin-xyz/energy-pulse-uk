-- Delete social_posts records for daily summary cards
DELETE FROM social_posts 
WHERE post_type = 'summary' 
  AND summary_date IS NOT NULL 
  AND image_path IS NOT NULL;

-- Delete files from storage bucket
DELETE FROM storage.objects 
WHERE bucket_id = 'social_cards' 
  AND name LIKE 'daily-summary-%';