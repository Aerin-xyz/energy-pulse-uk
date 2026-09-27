-- Same five-minute cadence; allow the provider's publication to arrive.
SELECT cron.alter_job(jobid, schedule := '1-59/5 * * * *') FROM cron.job WHERE jobname='warmup-energy-functions';
