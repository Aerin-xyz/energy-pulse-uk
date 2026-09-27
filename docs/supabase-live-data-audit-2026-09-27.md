# Supabase versus the live Energy Mix site

Read-only audit, 27 September 2026, approximately 17:24–17:31 BST. No functions, data, jobs, permissions, subscriptions or deployments changed. Local code reference: `48c0dd8`; findings were cross-checked against public browser requests, deployed function bodies and live database/API aggregates. Measurements are point-in-time, not billing statements.

## Executive conclusion

The existing architecture can be made substantially more efficient without a rebuild. It is not currently safe to claim it fits the Free plan: PostgreSQL reports **1,234,603,155 bytes (~1.23 GB decimal)**, above the published 500 MB database allowance. Historical payloads and operational logs dominate; current cache storage is negligible. Actual organization subscription and monthly metered egress were not verified. No guarantee of indefinitely free operation is possible without traffic and quota monitoring.

The homepage national mix does not consume the fresher Supabase generation data. Simply switching payloads would also change metric definitions: the homepage uses completed-period transmission generation, whereas the legacy Supabase payload incorporates embedded estimates and has an import-inclusive percentage path. Unify the calculation contract before switching.

## Live data routing

| Feature | Observed/current path | Assessment |
| --- | --- | --- |
| Homepage generation, demand, renewables, storage, evidence/cable history | `/data/grid-evidence.json`, built by GitHub ingestion and served by Cloudflare | Browser showed **205 minutes old**. Public snapshot generated at 13:05:50 UTC. Reloading every minute cannot refresh the underlying source. |
| Carbon reading and market price; legacy Explore/data context | Supabase `energy-data` | Active and receiving newer observations, but different definitions and source clocks. |
| Historical chart hook | Supabase `historical-generation` | Called on homepage load; local hook polls every 30 minutes. Warmup also calls it every four minutes. |
| Asset notified output | Cloudflare `/api/asset-operations` → Elexon PN | Separate working, period-aware cached route; do not move into Supabase merely for uniformity. Notifications remain plans, not actuals. |
| Asset register, measured asset snapshots, network backdrop | Static `/data/operational-assets.json`, `generation-assets.json`, `network-geography.json` | Keep large, slowly changing geography/catalogue off Supabase's hot read path. |
| Carbon outlook and regions | Browser → official Carbon Intensity API | Direct requests observed; shared edge caching is a possible resilience improvement. |

A fresh navigation to **About also fetched `energy-data`**. `EnergyDataProvider` wraps all application routes. Its local timers request high/mid/full at 2/5/10 minutes once running: nominally 48 calls per continuously open visitor-hour, before coalescing, visibility, browser throttling and retries. Restrict live providers to routes that need them, and pause polling in hidden tabs.

Browser responses for energy and historical functions had no Cache-Control header. Static geography/catalogue used the same 60-second caching policy as dynamic snapshots. Versioned URLs would allow long caching of those large, infrequently changing files without hiding updates.

## Database footprint

Relation sizes include indexes/TOAST and allocated space; they are not just compressed useful payload bytes. MB below is decimal.

| Relation | Allocated MB | Evidence |
| --- | ---: | --- |
| `energy_data_history` | 677.2 | 252,267 rows; earliest `as_of` 30 August 2025. 778 rows in the sampled last 24 hours. |
| `cron.job_run_details` | 317.0 | 115,111 rows, back to 11 November 2025. |
| `rate_limits` | 171.0 | 487,025 rows; **486,864 older than two hours**. Oldest October 2025. |
| `net._http_response` | 55.4 | 90 retained response rows at inspection; allocation is much larger than row count suggests. Check churn/reusable space before any maintenance. |
| `api_cache` | 0.254 | Only three entries; sampled full/mid JSON payloads approximately 7.7 KB each. |

`energy_data_history` has a primary key and descending `as_of` index, but no unique observation/revision key. Local energy function inserts a full last-known-good payload on a cache miss using **fetch time** as `as_of`; deployed body confirms history insertion. The 778 recent rows contained 112 distinct `asOf` metadata objects; this suggests repeated period snapshots but is **not proof that all others are exact duplicates**, because price/frequency and other source values can legitimately change within a period.

The live `cleanup_old_rate_limits()` function exists and targets records older than two hours. The deployed warmup does **not** call it, and no separate cleanup cron is installed. Warmup calls only `cleanup_expired_cache()`, which deletes expired cache rows. Expired rate limits are therefore a clear retention defect.

## Ingestion and execution

One active cron: `warmup-energy-functions`, `*/4 * * * *`. Its deployed function sequentially invokes `energy-data` for high, mid and full, then historical generation and expired-cache cleanup. This is five Edge Function invocations per scheduled cycle including the warmup itself: **1,800/day or 54,000 per 30-day month**, assuming all calls run, before visitor requests. Cache hits still incur invocation and some database work.

The three energy caches expire after 75, 240 and 300 seconds. A four-minute warmup cannot keep a 75-second cache continuously warm. Separate cache keys cause overlapping upstream work and last-known-good writes. Database rate limiting performs writes before cache lookup; even cache hits have database overhead.

Cron recorded 360 successful SQL dispatches in the sampled 24 hours. However, **85 of 90 retained pg_net results were timeouts**, with five HTTP 200 responses. A SQL dispatch success is not an ingestion success; a caller timeout is also not proof the function stopped.

Management analytics returned 25 hourly buckets including partial boundary hours (not an exact billing-period total):

| Function | Requests | HTTP success | Server errors | Other evidence |
| --- | ---: | ---: | ---: | --- |
| energy-data | 1,306 | 1,306 | 0 | Five error logs; maximum execution ~99s. |
| historical-generation | 409 | 409 | 0 | 2,668 warning logs; maximum execution ~6s. |
| cache-warmup | 351 | 346 | 5 | Maximum execution ~155s. |

These counts cover only the three inspected functions. Warning counts need source-specific diagnosis, not automatic classification as bad data. Other deployed editorial/social functions were inventoried but not invoked; unused deployments themselves are not a reason to delete them.

## Freshness and semantic integrity

At approximately 16:24 UTC, the Supabase full cache had:

- payload refresh at 16:24:16 UTC;
- generation observation 16:15 UTC;
- frequency 16:23:45 UTC;
- price/solar 16:00 UTC;
- carbon 15:30 UTC;
- interconnectors 15:00 UTC;
- station load 08:30 UTC;
- null demand and embedded-wind timestamps, nevertheless marked live;
- aggregate `asOf.endISO` 16:30 UTC, later than retrieval, alongside settlement-period metadata requiring reconciliation.

Do not use fetch time or the future half-hour endpoint as a universal actual-observation timestamp. Maintain per-source observation, publication and fetch times, with separate state for unavailable, stale, measured, estimated, notified and forecast. Preserve missing versus zero, GB scope, signed storage/transfers and the reviewed asset mappings. Keep completed-half-hour FUELHH and near-current FUELINST as explicitly different products.

## Prioritized improvement plan

1. **Bound storage growth first.** Preview affected rows and export/verify useful history before deleting anything. Retain a small current/last-good cache separately from a canonical source-interval history. Upsert using source + observation interval + revision; retain changed revisions deliberately, not every request. Suggested policy for approval: 30 days raw observations, longer compact half-hour/daily aggregates; 7–14 days cron logs; two hours rate limits plus an agreed diagnostic margin. Reclaim space with supported, scheduled maintenance: ordinary DELETE/VACUUM does not necessarily shrink allocated disk. Table rewrites/VACUUM FULL require lock, disk-headroom and rollback planning. No destructive cleanup was performed.

2. **Create one validated ingestion path for national data.** Extend existing Supabase implementation and shared calculations. Use one scheduled orchestrator, bounded source fetches, overlap prevention and shared results; fetch each source only when due. Initial target: one five-minute scheduler (8,640 invocations per 30 days if sources are fetched inside that invocation), rather than five invocations per four-minute cycle. That is an **84% modeled reduction in scheduled invocations**, not total traffic or a verified saving. Preserve five-minute FUELINST if wanted; fetch completed half-hours with bounded publication-lag retries; carbon and PN by their actual release cadence. Do not claim one cadence suits all sources.

3. **Serve through the existing Cloudflare layer.** Give browsers one small, shared, source-dated snapshot. Cache at the edge with a bounded TTL; serve last-good content explicitly as stale on failure. Prevent cache stampedes, use ETags/conditional requests and observe origin hit rate. Keep credentials out of public responses. Cloudflare quotas also need monitoring; it is not unlimited free capacity.

4. **Route-aware frontend.** Do not fetch live data on About/privacy/article pages. Consolidate overlapping high/mid/full polling; pause in hidden tabs; fetch longer history only when a chart needs it. Keep slow-changing map geography/catalogues static, compressed and versioned. Avoid streaming complete history to every page.

5. **Make job health meaningful.** Set appropriate bounded dispatch/worker deadlines, record completion separately from dispatch, track source fetch outcomes, revisions and last successful observation. Keep summaries rather than unlimited verbose logs. Investigate historical-generation warnings and warmup errors. Alert on freshness and budget thresholds, not simply SQL cron success.

6. **Cut over safely.** Compare canonical new output against official feeds and the present shared calculations; test DST, missing data, imports, storage and embedded generation. Only retire GitHub's time-sensitive national refresh after Supabase and public edge cache are verified over multiple cycles. Keep static catalogue/network jobs at weekly/monthly cadence and retain rollback snapshots.

## Free-plan budget and limitations

Official pricing checked during this audit: [Supabase pricing](https://supabase.com/pricing). Published Free allowances include 500 MB database, 500,000 Edge Function invocations, 5 GB egress, 5 GB cached egress, 1 GB object storage and 50,000 MAU. Cached storage egress is not interchangeable with arbitrary function/database egress. Unlimited API requests does not mean unlimited compute, invocation or bandwidth capacity.

Recommended operating targets: database below 300–350 MB after verified reclamation; source-history/log retention bounded; warnings at 60/80/90% of relevant quotas; monthly functions comfortably below 500k and uncached egress below 5 GB. Do not install paid add-ons or upgrade automatically.

The active organization's actual subscription, monthly billed usage and egress meter were not available from the audited public management endpoints. Verify these in the [organization usage dashboard](https://supabase.com/dashboard/org/zblcciwoeiqzfstoptee/usage) before asserting compliance. The measured database size is the immediate concern regardless; the core national-data and map workload should be feasible on Free after optimization at modest traffic, but traffic-dependent guarantees are not justified.

## Validation and exclusions

Verified through read-only management API queries, relation sizes/counts, function-body feature inspection, official pricing, local code tracing and live Chromium network capture on homepage/About. No application tests were run because no implementation changed. One broad history aggregate timed out; narrower indexed/count queries supplied the stated measurements instead. No secret values, user/IP records, cron command text or authentication headers were collected in this report. No schema edits, cleanup, cron changes or release occurred.
