-- Review-only foundation. NO scheduler changes and NO public access to raw evidence.
CREATE TABLE public.grid_operation_revisions (
 dataset text NOT NULL CHECK(dataset IN ('DISEBSP','BOAV-bid','BOAV-offer','BOALF','BMUNITS')),
 source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{64}$'),
 first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 source_url text NOT NULL CHECK(source_url LIKE 'https://data.elexon.co.uk/bmrs/api/v1/%'),
 raw_payload jsonb NOT NULL CHECK(octet_length(raw_payload::text)<=4194304),
 PRIMARY KEY(dataset,source_hash)
);
CREATE TABLE public.grid_operation_snapshots (
 key text PRIMARY KEY CHECK(length(key)<=100), dataset text NOT NULL CHECK(dataset IN ('DISEBSP','BOAV-bid','BOAV-offer','BOALF','BMUNITS')),
 scope jsonb NOT NULL, snapshot jsonb, updated_at timestamptz,
 last_attempt_at timestamptz NOT NULL DEFAULT now(), next_attempt_at timestamptz NOT NULL,
 error text CHECK(length(error)<=200),
 CHECK(snapshot IS NULL OR octet_length(snapshot::text)<=4194304)
);
CREATE INDEX grid_operation_snapshots_retention ON public.grid_operation_snapshots(last_attempt_at);
CREATE INDEX grid_operation_revisions_retention ON public.grid_operation_revisions(last_seen_at);
ALTER TABLE public.grid_operation_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_operation_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.grid_operation_revisions,public.grid_operation_snapshots FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.grid_operation_revisions,public.grid_operation_snapshots TO service_role;

CREATE FUNCTION public.claim_grid_operations(run_owner uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed integer;
BEGIN
 INSERT INTO energy_ingestion_state(name,owner,started_at,lease_until,status)
 VALUES('grid-operations',run_owner,now(),now()+interval '3 minutes','running')
 ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,started_at=excluded.started_at,lease_until=excluded.lease_until,status='running'
 WHERE energy_ingestion_state.lease_until<now() AND energy_ingestion_state.started_at<now()-interval '5 minutes';
 GET DIAGNOSTICS claimed=ROW_COUNT; RETURN claimed=1;
END $$;

CREATE FUNCTION public.save_grid_operation(k text, payload jsonb, due timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source text:=payload->>'dataset'; footprint bigint;
BEGIN
 IF source IS NULL OR payload->>'sourceHash' IS NULL OR payload->'raw' IS NULL OR jsonb_typeof(payload->'records')<>'array' OR jsonb_array_length(payload->'records')>10000 THEN RAISE EXCEPTION 'Invalid operations payload'; END IF;
 IF due>now()+interval '25 hours' OR due<now() THEN RAISE EXCEPTION 'Invalid source due time'; END IF;
 -- Compact raw revisions retained three days; normalized fetched windows seven days.
 -- Original provider links, row IDs and publication timestamps remain in normalized records.
 DELETE FROM grid_operation_revisions WHERE last_seen_at<now()-interval '3 days';
 DELETE FROM grid_operation_snapshots WHERE last_attempt_at<now()-interval '7 days';
 SELECT pg_total_relation_size('grid_operation_revisions')+pg_total_relation_size('grid_operation_snapshots') INTO footprint;
 IF footprint>67108864 OR pg_database_size(current_database())>262144000 THEN RAISE EXCEPTION 'Operations storage budget exceeded'; END IF;
 INSERT INTO grid_operation_revisions(dataset,source_hash,source_url,raw_payload)
 VALUES(source,payload->>'sourceHash',payload->>'sourceUrl',payload->'raw')
 ON CONFLICT(dataset,source_hash) DO UPDATE SET last_seen_at=now();
 INSERT INTO grid_operation_snapshots(key,dataset,scope,snapshot,updated_at,next_attempt_at)
 VALUES(k,source,payload->'scope',payload-'raw',now(),due)
 ON CONFLICT(key) DO UPDATE SET snapshot=excluded.snapshot,updated_at=now(),last_attempt_at=now(),next_attempt_at=excluded.next_attempt_at,error=NULL
 WHERE grid_operation_snapshots.updated_at IS NULL OR (grid_operation_snapshots.snapshot->>'retrievedAt')::timestamptz <= (payload->>'retrievedAt')::timestamptz;
END $$;

REVOKE ALL ON FUNCTION public.claim_grid_operations(uuid),public.save_grid_operation(text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_grid_operations(uuid),public.save_grid_operation(text,jsonb,timestamptz) TO service_role;
COMMENT ON TABLE public.grid_operation_revisions IS 'Bounded original upstream responses; not a permanent historical archive. Enable only after measured budget acceptance.';

-- Runs once per authenticated cycle before source writes, so retention commits even
-- when a later source write fails its size/allocated-space budget.
CREATE FUNCTION public.maintain_grid_operations() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM grid_operation_revisions WHERE last_seen_at<now()-interval '3 days';
 DELETE FROM grid_operation_snapshots WHERE last_attempt_at<now()-interval '7 days';
 RETURN jsonb_build_object('databaseBytes',pg_database_size(current_database()),'operationsBytes',pg_total_relation_size('grid_operation_revisions')+pg_total_relation_size('grid_operation_snapshots'));
END $$;
REVOKE ALL ON FUNCTION public.maintain_grid_operations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_grid_operations() TO service_role;
