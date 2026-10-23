-- Requires ENERGY_INGESTION_TOKEN to be provisioned in Edge Secrets and
-- the matching value in Vault by the protected setup tool. No literal secrets.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='energy_ingestion_token_20261023') THEN
  RAISE EXCEPTION 'Provision protected ingestion credential before changing the scheduler';
 END IF;
END $$;
SELECT cron.alter_job(jobid, command := $energy_schedule$
SELECT net.http_post(
  url := 'https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/cache-warmup',
  headers := ('{"Content-Type":"application/json"}'::jsonb || jsonb_build_object('Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='energy_ingestion_token_20261023'))),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
 );
$energy_schedule$) FROM cron.job WHERE jobname='warmup-energy-functions';
COMMIT;
