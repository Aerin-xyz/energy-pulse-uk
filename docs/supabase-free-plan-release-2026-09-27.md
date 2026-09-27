# Supabase efficiency release — 27 September 2026

Implemented under the user's approval to try the audit recommendations. Production frontend, backend functions and schedules are deployed. This supersedes the implementation status (not the original measurements) in `supabase-live-data-audit-2026-09-27.md`.

## Verified outcome

- Allocated PostgreSQL database: **1,234,603,155 → 100,715,667 bytes**, approximately **92% smaller**, below the published 500 MB Free database allowance at inspection.
- **229,874 older history rows** exported, compressed, re-read and count-verified before retention cleanup. Archive: `artifacts/energy-mix-supabase-2026-09-27/energy-history-before-30-days.jsonl.gz` under the parent workspace; SHA-256 `20cf8db11705fdd340e7c4c55404ab29604af7e5bcd0b59cd28b0e6253cdbf63`. **22,401 recent legacy history rows retained.** Rollback function bundles and maintenance measurements are alongside it.
- Expired rate-limit records and old scheduler logs removed; allocated space reclaimed after checking disk headroom. Hourly maintenance bounds new observation history to 30 days, rate limits to two hours and cron logs to 14 days. Daily rollups preserve coverage and London clock-change day lengths.
- National ingestion now runs every five minutes with a database lease, bounded source calls, revision-aware observations and separately recorded completion. Legacy high/mid/full warmups and scheduled historical-chart refresh removed.
- Scheduled function baseline: **54,000 → 17,280 invocations per 30 days**, a **68% modeled reduction**. This deliberately retains one enrichment function call per orchestrator cycle; the audit's proposed 84% single-invocation target was not fully implemented. Viewer-triggered history calls and other traffic are additional.
- Homepage national mix, demand and briefing use shared completed-period calculations and Supabase snapshots via Cloudflare. Imports, signed storage, embedded-generation scope and missing values remain explicit. Asset notifications remain schedules, not measured output.
- Five-minute shared edge caching and ETags; history cached for 30 minutes. Hidden-tab polling paused, About/static routes no longer request live energy data. Slow map/catalogue payloads remain static with longer caching.
- GitHub national evidence fallback reads the shared endpoint hourly instead of independently repeating time-sensitive national ingestion. Slower NESO, catalogue and geography products retain their distinct update paths.

## Production acceptance

- **47 calculation/source tests**, **45 browser tests**, TypeScript and production build passed. Browser suite included targeted reruns after fixing hydration timing in a new test; not every test was rerun after documentation-only changes.
- Live desktop (1440 px) and mobile (390 px): no horizontal overflow or application errors; screenshots saved with the artifacts.
- About: zero data API requests. Homepage application requests go through same-origin cache endpoints rather than direct Supabase browser requests.
- Live national reading observed at **16:30 UTC**, displayed about **24 minutes old** during acceptance, versus **205 minutes** in the audit. This remains a completed reporting interval, not instantaneous telemetry.
- Automatic **16:55 UTC** cycle started at 16:55:01 and completed at 16:55:02: FUELHH, INDO, FUELINST and enrichment all `ok`. Actual dispatch HTTP **200**, no timeout; separately recorded ingestion `succeeded`.
- One **16:50 UTC** scheduler startup timed out during compaction. Manual recovery and the subsequent automatic cycle succeeded. This transient maintenance failure is not concealed by SQL dispatch status.
- Deployed implementation commits: `b51a09e`, `6469cae`, `62000fa`; subsequent normal daily data refresh preserved. Backend energy-data version 191 and cache-warmup version 43 active at verification.

## Remaining limits and follow-up

- No subscription change, paid add-on or automatic upgrade. Actual organization billing tier and monthly egress meter remain unverified. A database under 500 MB is **not** proof that every Free quota is satisfied, nor a guarantee at arbitrary traffic.
- Hourly database budget health records a 350 MB warning and 500 MB critical threshold. Monthly invocation/egress usage still needs billing-dashboard observation; no unsolicited external alert channel was installed.
- Legacy historical and auxiliary European/source integrations remain behind caches, rather than being completely rewritten. Their source-specific warnings deserve a separate targeted audit. Auxiliary sources still share an enrichment cycle instead of each having a fully independent due-time schedule.
- Carbon forecast/region browser calls, asset PN caching and catalogue/geography paths remain separate working integrations. Large static files have longer TTLs, not a newly versioned URL scheme.
- Archive is a verified local recovery copy, not an independently replicated off-site backup. Preserve it before any further history removal.
- Edge-cache origin hit rates, real egress savings and longer-term storage growth require observation over normal traffic. Reported invocation savings are schedule arithmetic, not billed usage measurements.
