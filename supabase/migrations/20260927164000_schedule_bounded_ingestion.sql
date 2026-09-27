-- Replace only the existing energy warmup, preserving unrelated jobs.
SELECT cron.alter_job(jobid, schedule := '*/5 * * * *', command := $command$
 SELECT net.http_post(
  url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/cache-warmup',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
 );
$command$) FROM cron.job WHERE jobname='warmup-energy-functions';
SELECT cron.schedule('energy-operational-retention','17 * * * *','SELECT public.maintain_energy_operational_records();');
