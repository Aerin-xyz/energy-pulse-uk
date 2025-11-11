-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to warm cache every 4 minutes
SELECT cron.schedule(
  'warmup-energy-functions',
  '*/4 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/cache-warmup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxMjU5NjksImV4cCI6MjA0NTcwMTk2OX0.QJHVZrV1eJfWIFU4gxo-f7dkDiLNhF7vjxWEveFwfTE"}'::jsonb
  ) as request_id;
  $$
);