CREATE TABLE IF NOT EXISTS public.energy_ingestion_state (
 name text PRIMARY KEY, owner uuid, started_at timestamptz, completed_at timestamptz,
 lease_until timestamptz, status text, details jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.energy_ingestion_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.energy_ingestion_state FROM anon, authenticated;
GRANT ALL ON public.energy_ingestion_state TO service_role;
CREATE OR REPLACE FUNCTION public.claim_energy_ingestion(run_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer;
BEGIN
 INSERT INTO energy_ingestion_state(name,owner,started_at,lease_until,status)
 VALUES('national',run_owner,now(),now()+interval '3 minutes','running')
 ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,started_at=excluded.started_at,lease_until=excluded.lease_until,status='running'
 WHERE energy_ingestion_state.lease_until<now()
 AND energy_ingestion_state.started_at<to_timestamp(floor(extract(epoch FROM now())/300)*300);
 GET DIAGNOSTICS claimed=ROW_COUNT;
 RETURN claimed=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_energy_ingestion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_energy_ingestion(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.maintain_energy_operational_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.rate_limits WHERE window_start<now()-interval '2 hours';
 DELETE FROM cron.job_run_details WHERE start_time<now()-interval '14 days';
 DELETE FROM public.api_cache WHERE expires_at<now();
 INSERT INTO energy_ingestion_state(name,completed_at,status,details)
 VALUES('storage-budget',now(),CASE WHEN pg_database_size(current_database())>=500000000 THEN 'critical' WHEN pg_database_size(current_database())>=350000000 THEN 'warning' ELSE 'ok' END,
 jsonb_build_object('databaseBytes',pg_database_size(current_database()),'warningBytes',350000000,'publishedFreeAllowanceBytes',500000000))
 ON CONFLICT(name) DO UPDATE SET completed_at=excluded.completed_at,status=excluded.status,details=excluded.details;
END $$;
REVOKE ALL ON FUNCTION public.maintain_energy_operational_records() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_energy_operational_records() TO service_role;

CREATE TABLE IF NOT EXISTS public.grid_observations (
 source text NOT NULL CHECK(source IN ('FUELHH','INDO')),
 start_time timestamptz NOT NULL, series text NOT NULL, published_at timestamptz NOT NULL,
 value_mw double precision NOT NULL,
 PRIMARY KEY(source,start_time,series,published_at)
);
ALTER TABLE public.grid_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grid_observations FROM anon,authenticated;
GRANT ALL ON public.grid_observations TO service_role;
CREATE TABLE IF NOT EXISTS public.grid_daily_rollups (
 source text NOT NULL, day date NOT NULL, series text NOT NULL,
 energy_mwh double precision NOT NULL, average_mw double precision NOT NULL,
 observed_periods integer NOT NULL, expected_periods integer NOT NULL,
 complete boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source,day,series)
);
ALTER TABLE public.grid_daily_rollups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grid_daily_rollups FROM anon,authenticated;
GRANT ALL ON public.grid_daily_rollups TO service_role;
CREATE OR REPLACE FUNCTION public.maintain_energy_operational_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO grid_daily_rollups(source,day,series,energy_mwh,average_mw,observed_periods,expected_periods,complete)
 WITH latest AS (
  SELECT DISTINCT ON(source,start_time,series) source,start_time,series,value_mw
  FROM grid_observations WHERE start_time<date_trunc('day',now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'
  ORDER BY source,start_time,series,published_at DESC
 ), grouped AS (
  SELECT source,(start_time AT TIME ZONE 'Europe/London')::date AS day,series,
   sum(value_mw)*0.5 AS energy_mwh,avg(value_mw) AS average_mw,count(*)::int AS n
  FROM latest GROUP BY 1,2,3
 ), calculated AS (
  SELECT *, (extract(epoch FROM (((day+1)::timestamp AT TIME ZONE 'Europe/London')-(day::timestamp AT TIME ZONE 'Europe/London')))/1800)::int AS expected FROM grouped
 ) SELECT source,day,series,energy_mwh,average_mw,n,expected,n=expected FROM calculated
 ON CONFLICT(source,day,series) DO UPDATE SET energy_mwh=excluded.energy_mwh,average_mw=excluded.average_mw,observed_periods=excluded.observed_periods,expected_periods=excluded.expected_periods,complete=excluded.complete,updated_at=now();
 DELETE FROM grid_observations WHERE start_time<now()-interval '30 days';
 DELETE FROM public.rate_limits WHERE window_start<now()-interval '2 hours';
 DELETE FROM cron.job_run_details WHERE start_time<now()-interval '14 days';
 DELETE FROM public.api_cache WHERE expires_at<now();
 INSERT INTO energy_ingestion_state(name,completed_at,status,details)
 VALUES('storage-budget',now(),CASE WHEN pg_database_size(current_database())>=500000000 THEN 'critical' WHEN pg_database_size(current_database())>=350000000 THEN 'warning' ELSE 'ok' END,
 jsonb_build_object('databaseBytes',pg_database_size(current_database()),'warningBytes',350000000,'publishedFreeAllowanceBytes',500000000))
 ON CONFLICT(name) DO UPDATE SET completed_at=excluded.completed_at,status=excluded.status,details=excluded.details;
END $$;
