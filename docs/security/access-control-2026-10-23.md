# Energy Mix access-control remediation — 23 October 2026

Authorised by Joe: “fix energy mix” following the live exposure audit. Backend changes only; no frontend redesign, newsletters, social posts or customer-data mutations.

## Changes

- Restrict seven misleadingly named service-role ALL policies to the actual `service_role`: newsletter_issues, ranked_items, raw_items, send_logs, snapshot_metrics, social_posts, summaries. Preserve approved/sent newsletter public read policy.
- Remove public/anon/authenticated write grants on those seven and api_cache, rate_limits, energy_data_history. Preserve public read policies and service-role operations.
- Restrict cleanup_expired_cache, cleanup_old_rate_limits and increment_rate_limit execution to service_role (and owners); newer ingestion/retention RPCs already restrict public roles.
- Replace 12 legacy workflow/test/diagnostic function entrypoints with explicit 403 denials. These had no valid administrator boundary. They are intentionally unavailable, including to public-key callers; rebuilding a properly authenticated publishing workflow is separate work. Rollback bundles are retained locally, not included in repository source.
- Authenticate cache-warmup using a dedicated opaque bearer credential before creating a privileged database client. Store only in Supabase Edge Secrets and encrypted Vault, never source/config/logs. Existing pg_cron schedule and timeout preserved; scheduler reads Vault at execution. Edge verify_jwt remains false intentionally because this is an opaque dedicated credential, not the public Supabase JWT. Missing/invalid bearer returns 401; missing server configuration fails closed with 503.
- Preserve production module sources, including a newer retained/unavailable freshness-state correction not present in the initial local checkout. Pin the existing deployed supabase-js version 2.117.2 for this function to avoid an incidental library upgrade.

## Verification

- 19 focused authentication/disabled-handler tests plus 12 existing ingestion/calculation tests pass (31 total). Initial run of the existing ingestion test from the workspace root failed because its child-process import is cwd-relative; rerun from the repository root passed without changing that test.
- Live database metadata confirms no PUBLIC ALL policies, all 13 public tables deny anonymous/ordinary authenticated DML, service writes remain permitted, and maintenance RPC execution is restricted.
- Six private-table HEAD requests with the public client report zero visible rows. All 12 disabled function POST probes return 403; publisher also returns 403 with the public API key. Missing and invalid scheduler credentials return 401.
- Public homepage, grid-evidence and energy-data return HTTP 200. Authenticated dispatch through the actual scheduler command returned HTTP 200 without timeout. Completion timing and automatic-cycle evidence are in the local release report.

## Operations and rollback

The second migration assumes the protected credential has already been provisioned in both stores; it contains only a Vault reference and preserves the existing cadence. Do not rotate just one side. Do not replace the opaque bearer with a browser/public key.

Evidence/backup directory: `/home/aerins/.openclaw/workspace/reports/security/energy-remediation-20261023/`. Contains pre-change permission metadata, exact original deployed bundles, deployment receipts, safe response evidence and rollback SQL/previous scheduler command. Restoring these backups can reintroduce vulnerabilities; use operator review and coordinated function/scheduler restoration, not an automatic rollback to public access. No rollback was performed.

These changes close the identified access-control exposures. They do not establish absence of historical misuse, resolve the separate weekly-report quality questions, or certify the whole application.
