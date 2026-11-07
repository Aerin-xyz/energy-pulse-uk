# Grid Intelligence — Phase 0 audit and Phase 1 proposal

Audit: 26 October 2026, approximately 16:08–16:14 UTC (UK GMT). Branch: `feat/grid-intelligence`, baseline `310ad0754369a7724661a70288baf712cf6982c4`.

## Decision and boundary

Execute incrementally, not a simultaneous six-phase launch. This is the required pre-architecture checkpoint. No production code, permissions, schedules, database rows or deployed assets were changed. Preserve the user's latest map-first preference (which supersedes the older summary-first design brief). Continue with isolated adapters and fixtures next; no new production ingestion until definitions, reconciliation and storage budgets pass review.

## 1. Current architecture / deployment

React 18, TypeScript, Vite, React Router and Recharts. Cloudflare Pages serves prerendered explanatory HTML and same-origin API functions. Supabase Edge Functions and Postgres provide shared national snapshots. GitHub publishes slower static evidence/catalogues and gated reports. No framework or database migration is needed for the expansion.

`origin/main` matches latest approved map-label release; its Cloudflare check succeeded. The daily report job failed specifically at **Build with external validation gate**, independently of the successful site deployment. Do not bypass the report gate or describe the live national pipeline as failed.

### Reuse inventory

| Capability | Existing implementation / flow | Decision |
|---|---|---|
| National generation and demand | `cache-warmup` → FUELINST/FUELHH/INDO → `api_cache` public-grid/public-energy snapshots → Cloudflare `grid-evidence` / `energy-data` → shared React context | Reuse; do not fetch the same national sources in new page components |
| Revisions and history | `grid_observations` keys include source/start/series/publication; daily rollups; ingestion lease and completion table | Extend patterns, but don't put MWh or GBP into `value_mw` |
| Carbon, market index, frequency, solar | Existing `energy-data` enrichment, interval-aware carbon and source clocks | Preserve. Market index is NOT settlement imbalance price or household tariff |
| Interconnectors | FUELHH country aggregates and FUELINST cable evidence; signed flows | Reuse, retain different periods and coverage |
| Atlas | `GridCommandCentre`, generation map/explorer, network geography, search/filter/camera URLs | Extend existing inspector, preserve automatic loading and map-first order |
| Asset operations | `functions/api/asset-operations.ts`, PN mappings and ingestion scripts | Reuse explicit unit groups. Do not treat PN as observed output or force site/unit one-to-one matches |
| Network constraints | `NetworkConstraints.tsx`, `ingest-grid-evidence.mjs`, NESO costs, forecasts and limits | Repair and extend; do not create a second constraints page |
| Forecasts / history | Existing cleaner-window tool, history inspector, export and time helpers | Reuse contiguous-window checks, DST-safe labels and forecast/actual separation |
| Reports | All-days validation, saved source evidence, archival coverage disclosures | Keep publication blocked until accounting/source discrepancies are resolved |
| Initial HTML | `prerender-static.mjs`, `initialEvidence`, shared server-rendered components | Useful explanation + honest unavailable state, not current server-side numbers |
| SEO foundations | Route manifest, canonical/redirect map, metadata, robots, sitemap, real 404 | Extend existing registry, not parallel schema/navigation |

### Live operational inventory (read-only management queries)

- Postgres allocated size: **98,675,859 bytes** (~98.7 MB decimal). This is not a billing/egress/free-plan guarantee.
- `warmup-energy-functions`: active `1-59/5 * * * *`; retention: active `17 * * * *`.
- 26 successful scheduler entries in preceding two hours. Separately, national completion at 16:06:22 reported FUELINST, FUELHH, INDO and enrichment `ok`; subsequent snapshots updated at 16:11:21.
- Retained HTTP dispatch results: 72 HTTP 200, no timeout (retained sample, not a long-term error rate).
- Approximate live rows: grid_observations 29,463; legacy energy_data_history 22,401; grid_daily_rollups 609; rate_limits 52; cron logs 4,317.
- New observations have 30-day retention and operational-log cleanup in migrations. Legacy history still exists; don't delete it in this expansion.
- GitHub evidence ingestion is enabled and configured hourly at minute 7, but latest three actual runs began 10:55, 04:29 and 00:03 on 26 October. Scheduled frequency is not proven execution cadence.
- Catalogue weekly; geometry monthly; validated reports daily. Browser-triggered PN/history and regional/forecast requests remain separate paths.

### Duplication and boundaries

National static evidence uses the public shared snapshot when scheduled, rather than independently re-ingesting national data. FUELHH and FUELINST are intentionally separate observation bases, not duplicate readings. PN is refreshed both by the cached endpoint and by the static evidence workflow for fallback; reconcile this before adding dispatch history. Enrichment still bundles multiple sources into one cycle; per-source due times should be introduced without refetching unchanged data or touching healthy national cadence. Public cache TTL is storage retention, not proof of current observation validity.

## 2. Production observations

Saved raw responses and browser text/screenshots are under `evidence/`. These are point-in-time checks, not uptime guarantees.

| Data | Observed public state | Interpretation |
|---|---|---|
| National five-minute generation | 16:00 observation in initial capture; advanced to 16:05 in follow-up, matching official 16:05 fetched during audit | Working; no sustained one-cycle-lag conclusion from this short run |
| Generation/demand half-hour | 15:30–16:00 period | Correctly separate from instantaneous observations |
| Carbon | 15:30–16:00, actual 75 and forecast 76 | Matched official Carbon Intensity API interval and values |
| Market index | £226.32/MWh, period starting 15:30, APXMIDP | Published market index, not a consumer tariff or imbalance price |
| Frequency | 50.032 Hz at 16:03:45 | Separately timestamped |
| PN | 16:00–16:30, checked 16:10:20; source publication time explicitly unavailable | Intended operation, not actual metering |
| Constraint costs | Last retained day 6 October; schema error, last successful check 16 October | Broken refresh, not a current cost measure |
| Boundary forecasts | Retained range 20 October 04:30 to 24 October 22:30 UTC | Expired; browser correctly says no upcoming periods available |
| Embedded wind | Unavailable, timestamp null | Do not fill with zero or conflate with metered wind |

Confirmed constraint schema change: the current NESO 26–27 CSV resource `c730b788-4328-43dc-9f84-27fd3adeda59` uses field ID **Daily Cost GBP**; the adapter requires **Daily Cost (GBP)**. Metadata's human title still contains parentheses. Field metadata describes integer rounded GBP. Preserve raw fields and normalise via an explicit versioned alias, not a permissive arbitrary-column fallback.

Denmark's cached country flow was 1,426 MW against a displayed 1,400 MW capacity. This is a **review item**, not proof the reading is wrong: check capacity definition/reference vintage, measurement boundaries and temporary ratings. Never clamp real observations to nominal capacity.

## 3. Initial HTML, indexability and browser baseline

Public homepage and carbon initial responses return 200. Canonical/robots/sitemap assets are present; a deliberately unknown route returns 404. `initialEvidence` explicitly represents current readings as unavailable until the browser loads the validated cache. This was introduced to avoid presenting stale build-time numbers. The browser did load current data; the initial unavailable message is not evidence that ingestion failed.

Current initial HTML has useful explanations, but doesn't supply current numerical answers to non-JavaScript readers. Recommended improvement: bounded edge injection from the same validated snapshot, using one serialised initial object for HTML and hydration; retain honest unavailable/dated fallback. No crawler-specific content. Prototype cache parity and source failure before deploying. Do not revive stale build snapshots or bypass report validation to obtain headline numbers.

### Verified tests

- Production Chromium: home, constraints, carbon and Explore at 390 and 1366 px, 900 px height: HTTP 200, no page-wide overflow, no captured application exceptions.
- **21 existing live browser regressions passed**: map-first layout at eight widths, deep/max zoom with 0/100 MW filters, optional network names, label collisions, selection/permalink and expanded-map closure.
- **101 Node tests passed** after build; TypeScript and local production build passed. First pre-build run failed eight HTML tests because `dist` did not exist; that was setup, not concealed as application failure.
- Current screenshots and browser text saved. These do not certify physical mobile gestures, accessibility or performance.

### Performance findings / limits

One unthrottled cold-page lab sample per route/width, seven-second observation window. Not field p75 or a controlled before/after study. Homepage decoded resource total ~7.56 MB, transfer ~0.82 MB, consistent with automatically loaded atlas. Preserve user's automatic-map preference; profile lightweight overview/detail separation instead of putting the map behind an Open button again.

Observed CLS was concerning: home 0.302 mobile / 0.117 desktop; carbon 0.407 / 0.359; Explore 0.407 / 0.956. These need repeated trace attribution, especially initial-layout replacement and asynchronous chart/content sizing. Lab LCP values 0.51–0.78 seconds on this host do not establish real-user speed. No field INP, Search Console visibility, real-user error baseline, physical iOS/Android, VoiceOver or full WCAG certification was available in this pass. Existing preserved unit/interaction tests are not substitutes for those checks.

## 4. Ranked backlog

1. **P1 — Repair NESO cost schema contract** with both known field versions, fixture tests, official aggregate reconciliation and original timestamps preserved.
2. **P1 — Forecast expiry/coverage and scheduler reliability:** investigate current source resource and retrieval ordering/pagination; don't assume refreshing an old horizon makes it current. Explicit per-dataset status and completion monitoring; do not rely on successful GitHub job status when subcommands retain failed data.
3. **P1 — Reproduce and fix layout shifts** before adding cards/charts. Keep map front and centre and reserve module geometry.
4. **P1 — Source semantics for new operations:** approved sign/volume definitions, revisions, DST, provisional flags and accepted-volume source before exposing headlines.
5. **P2 — Initial HTML/current snapshot parity:** edge prototype with bounded timeout/cache, shared hydration seed and stale/unavailable fallbacks.
6. **P2 — Reconcile duplicate PN refresh/fallback paths; per-source due times and snapshot health monitoring.**
7. **P2 — Review country capacity references and missing embedded wind.** Do not fabricate coverage.
8. **Existing separate blocker — Report hydro/storage accounting and provider disagreement.** New operations features must not silently reopen report publication.

## 5. Proposed Phase 1 implementation (not yet deployed)

### Scope and reuse

Keep Cloudflare + Supabase. Extend ingestion with independently leased/due source jobs and a shared adapter interface; keep healthy national job cadence unchanged. Start with system prices/NIV and accepted actions, plus repairs above. REMIT, expanded asset mappings, additional constraint categories and forecast-vintage comparisons remain later phases.

Suggested modules: `scripts/evidence/adapters/system-prices.mjs`, `accepted-actions.mjs`, `neso-constraints.mjs`; shared settlement-period/provenance helpers; bounded server-side operations cache/query route. Names are proposed, not existing code.

### Contract

Each dataset declares units, kind, geography, period start/end UTC, settlement date/period, provider record ID, publication/revision time if supplied, retrieval time, parser/definition version, revision hash and source/attribution/licence links. Unknown publication time stays null. Distinguish observed settlement data, instructed actions and derived calculations. No generic `live` flag for every source.

Do not overload `grid_observations.value_mw`. Proposed isolated operations table stores dataset, natural key, period, unit, typed value/payload, provider revision and content hash. Unique revision-aware key makes retries idempotent; current view selects a deterministic latest revision without deleting evidence. Raw response evidence is content-addressed with bounded retention, no credentials. Restrict writes to backend role with explicit grants/RLS. Public pages read only bounded, validated snapshots through Cloudflare, not unrestricted upstream proxies or raw database tables.

### Sources / prototype evidence

System-price endpoint `https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/system-prices/2026-10-25?format=json` returned **50 periods**, including UTC timestamps across the clock change, buy/sell prices, net imbalance volume, accepted aggregate bid/offer volumes, `createdDateTime`, `priceDerivationCode` and default flags. Saved response is a real DST fixture, not yet an independently reconciled financial dataset.

Elexon public documentation links returned a JavaScript shell in direct HTTP inspection; guessed Swagger paths returned 404. Do not claim their full parameter/revision semantics verified yet. Phase 1 must inspect rendered official documentation and source examples before implementing signs/provisional-status labels. BOALF power levels alone are not accepted MWh: evaluate official settlement accepted-volume sources or derive energy only with a fully tested ramp/revision method. BOD multiplication is not total balancing-system cost. No curtailment headline.

NESO metadata confirms its open-data licence for the existing cost dataset. Elexon existing attribution/licence pattern is reusable only after verifying the new dataset's applicable terms. Do not generalise these rights to REMIT or every third-party source.

### Budget and cadence

Provisional system-price cadence: once per half-hour after observed publication, with bounded lookback for revisions. Determine precise delay from measurement, not an invented offset. Accepted actions require separate publication-lag measurements and response-size profile. Begin with bounded one-day prototypes; do not persist the complete BM feed at five-minute cadence.

Use the existing orchestrator where safe, but separate leases/status so a slow operations source cannot delay national publication. Candidate cadence adds ~1,440 half-hourly executions per 30 days if a separate function is necessary; actual function invocations depend on final bundling. Record payload bytes, retention/revision growth, egress and origin hits before activation. Keep existing 350 MB warning / 500 MB storage guard. Billing and account-wide quotas remain unverified. No paid services or public SLA commitments.

### Required gates before Phase 2

1. Official source/metric sign and unit definitions documented; licence reviewed.
2. Real fixtures for 46/48/50-period days, incomplete current day, duplicate/revised prices and missing publication times.
3. Reconciliation against official period-level observations, not just HTTP success or matching totals.
4. Fault tests: timeout, 429/backoff, schema drift, out-of-order revisions, restart/replay, retained last-good data and suppressed stale advice.
5. Bounded backfill and retention/disk-growth test; no new public grants or schedules before review.
6. Source health records distinguish dispatch success, ingestion completion, coverage and observation age.
7. Validated shared cache prototype before Grid Operations UI. Feature-flagged first release: period-labelled system price/NIV and supported accepted-action volumes. Defer financial totals and plant/cause attribution until evidenced.
8. Responsive/keyboard/error-state/contrast tests, real-source production verification and rollback plan.

## 6. Next checkpoint

Review this inventory and Phase 1 design, then implement isolated adapters and reconcile saved official records. Phase 2 follows only after that foundation passes. No broad redesign, new outage view, national curtailment estimate or unrelated source integration is part of this checkpoint.
