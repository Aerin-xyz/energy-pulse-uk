# Grid Intelligence — Phase 1 foundation

26 October 2026. Review branch `feat/grid-intelligence`. **Prepared and validated locally; not deployed.** This advances the approved Phase 0 proposal without launching Phase 2 or changing healthy national ingestion.

## Delivered

- Versioned, shared Elexon adapters for **DISEBSP system prices/NIV**, **BOAV signed acceptance volumes**, **BOALF power-level instructions**, and **BM Unit references**. Existing PN and national adapters are reused, not replaced.
- UTC/London settlement validation reuses existing settlement helpers; verified official 46-, 48- and 50-period day responses. Price and volume records retain provider creation timestamps and raw revision flags, including default/derivation indicators. No undocumented finality inference.
- Exact NESO cost-field aliases for `Daily Cost (GBP)` and `Daily Cost GBP`, preserving the original source field. Unknown schemas, inconsistent dual fields and missing values fail closed. Existing downstream field contract remains compatible.
- Boundary-forecast horizon health is independent of retrieval time. A fresh fetch of expired data stays expired. The existing source drawer reports that state.
- Shared collector with finite response-size/time budgets, bounded retry/backoff, Retry-After handling and host allowlist. No caller-supplied source proxy.
- Normalized envelopes include definition/parser versions, provider, source URL/licence, scope, period, units, kind, source creation time where supplied, retrieval time and raw response hash.
- A reusable ingestion runner, a separately leased and authenticated Supabase function, backend-only revision/snapshot tables, and a **disabled-by-default** Cloudflare read endpoint.
- Dataset due times, completion outcomes, bytes/row counts and last-good retention. Due times use shared UTC :20:55/:50:55 boundaries ahead of the proposed :21/:51 jobs rather than a drifting completion-plus-30-minute expiry that could skip the next scheduled job.
- Source-health workflow check after snapshot persistence: failed sources, overdue checks and expired forecast horizons are visible as unhealthy rather than hidden behind a successful HTTP fetch. It uses existing GitHub job status/summary, not a new outbound messaging integration.
- Qualified reference layer reuses the reviewed notification mappings and checks current name/operator/fuel/notification identity. Snapshot retains the mapping hash; conflicting ownership or changed identity is never automatically promoted.

## Evidence and validation

| Check | Result |
|---|---|
| Node regression + security tests | 141 passed (includes 21 new operations tests) |
| PostgreSQL-compatible isolated migration exercise | 12 checks passed in PGlite: permissions, leases, revisions, idempotency, older writes, atomic rejection, payload bounds and retention |
| Deno type check | New Edge Function passes with its actual remote Supabase imports |
| Existing frontend | Production build and TypeScript passed; no new operations UI |
| Targeted browser regression | 2 Chromium checks passed: 390/1366 px repaired cost display, expired forecast, no overflow/page errors |
| Local Cloudflare runtime | Functions compiled; disabled `/api/grid-operations` returns 404 |
| Official system-price fixtures | 29 March: 46 periods; 24 October: 48; 25 October: 50, all complete |
| BOAV cross-reconciliation | 25 October periods 1, 25 and 50: bid/offer detail sums match DISEBSP aggregates within 0.01 MWh |
| Current ingestion exercise | 26 October period 32 and previous-day period 32 both matched; all eight source requests succeeded |
| Immediate repeat exercise | Zero upstream requests; stored source due times respected |
| NESO costs | 300 fetched rows, zero GBP difference after normalisation; latest day 21 October |

Full results, raw fixtures, screenshots and compressed evidence: `phase1-validation/` and `phase1-fixtures/`. Large raw JSON envelopes are gzip-compressed without altering their contents. `evidence/` retains the original Phase 0 baseline. Tests initially exposed midnight-spanning instructions and missing Elexon IDs; neither was patched by inventing data.

The current BOALF response includes instructions starting on the preceding settlement date that overlap the requested period. Their original instruction window and source settlement date are retained; they are not rejected merely because the date differs. No conversion of instructed levels to incremental accepted energy is attempted.

Of 3,128 raw reference entries, one exact duplicate collapses to 3,127 identities. The reviewed mapping check returned **173 reviewed-existing unit links**, **3 review-required** and **2,951 unmapped**. These are unit records, not counts of physical stations. 82 raw reference rows lack an Elexon BM Unit ID and remain NGC-identified/unmapped. No fuzzy matching is added.

## Metric contract and limits

### System prices and NIV

`/balancing/settlement/system-prices/{settlementDate}` returns the latest settlement run per period (official rendered endpoint documentation saved). Prices are GBP/MWh; NIV and accepted volumes are MWh. Keep buy and sell prices separately, even if numerically equal. Preserve `priceDerivationCode`, `bsadDefaulted` and source creation time. Never describe this as second-by-second balancing, household price or final billing. Phase 2 must define its short/long display against the BSC sign convention explicitly; this foundation does not infer direction from price or from offer-minus-bid totals.

The current day has explicit missing future/not-yet-published periods, not zeros. History collection is not evidence that all source data is complete.

### Accepted actions

BOAV endpoint: `/balancing/settlement/acceptance/volumes/all/{bidOffer}/{settlementDate}/{settlementPeriod}`. Official docs specify latest settlement run only. Compare detailed rows with DISEBSP **only for an identical period and source creation timestamp**. Empty lists, null values or differing revision times produce unavailable reconciliation, not zero. Preserve negative bid and positive offer volumes; a sign-contract violation fails parsing.

BOALF is separately typed `instructed` in MW. Acceptance time is not source publication time; unavailable publication stays null. An instruction crossing periods retains its real window. Direction is left unknown without an appropriate baseline. No displayed metered output, curtailment, action cash flow or total balancing cost is derived from these records.

BOAV deletions are accepted only with a strictly newer source run; equal-version conflicts and backwards revisions retain the prior snapshot and record an error. The endpoint provides latest runs, so historical revisions predating initial collection cannot be recovered by claiming to have stored them. Original responses are retained only within the declared bounds below.

### Existing NESO evidence

The cost API currently reports through **21 October**; this is retrospective, not today's cost. The day-ahead resource still ends **24 October 22:30 UTC**, despite a successful retrieval on 26 October. The UI correctly has no upcoming forecast. No replacement forecast, invented flow, or curtailment interpretation is introduced. The full boundary archive is not fetched; existing bounded overview sampling is preserved.

## Storage, security and scheduling

Migration: `20261026163000_grid_operations_foundation.sql`.

- `grid_operation_revisions`: original JSON responses keyed by dataset and SHA-256; three-day rolling retention since last sighting.
- `grid_operation_snapshots`: normalized fetched windows and failure metadata; seven-day retention since last attempt. This is not a promised seven-day complete action archive.
- Source links, record IDs, publication timestamps and hashes remain on normalized observations. Raw evidence may expire first. This is explicit bounded evidence retention, not indefinite revision preservation.
- Tables have RLS enabled, no anon/authenticated grants, explicit service-role writes, protected RPCs. No public raw-data policy is added.
- At most 4 MiB per raw/normalized source payload and 10,000 rows. Operations writes stop beyond **64 MiB allocated operations-table space** or **250 MiB allocated total database space**. These are conservative application guards, not free-plan billing metrics.
- Retention commits independently before source writes. A source error cannot roll back that maintenance. Allocated space may require database maintenance to reclaim; a budget stop is a visible operator task, never permission to raise limits automatically.
- National lease/schedule remains untouched. Operations uses its own lease and state entry in existing `energy_ingestion_state`.
- Function is POST-only, protected by the existing dedicated scheduler token, and returns 404 unless `GRID_OPERATIONS_ENABLED=true`. Platform JWT verification is disabled only because the function performs that dedicated authorization; a public API key is insufficient.
- Cloudflare route is independently feature-flagged off and rejects arbitrary query parameters; it reads one public derived snapshot via the existing cache mechanism. Raw data and credentials are never exposed.
- No cron job is created by the migration. No production credentials, allowlists, grants or settings were changed.

Proposed activation schedule: half-hourly at **:21/:51**, subject to observed publication acceptance, with daily BM reference refresh. It fetches current/previous-day prices, latest published action period and one corresponding previous-day action period. This bounded lookback is **not** complete historical action/revision ingestion. Separate backfill requires an explicit range and budget; no accidental all-history fetch occurs. Older settlement runs beyond this window can be revised by the provider; long-lived reports must revalidate their entire source window separately.

Provisional freshness policy: settlement data current through 90 minutes after period end, delayed thereafter, stale after 180 minutes; reference checks use 24/72-hour boundaries. These are conservative availability thresholds, not a claim of measured publication SLA. Read views recompute age (30-second maximum edge cache) rather than freezing a `current` flag at ingestion. Historical price scopes may naturally be old; they must not be presented as the latest system position.

### Measured byte budget — not a billing projection

One exercise fetched 2.17 MB of BM references, cached daily. Other requests were 29–143 kB each. First derived snapshot was ~695 kB JSON, excluding the reference records. Recorded gzip samples are illustrations, **not Postgres allocation measurements**. Approximate uncached non-reference ingress at 48 cycles/day could exceed 30 MB/day; persistence compression/deduplication and traffic-dependent egress must be observed before enabling continuous production collection. One isolated cycle and PGlite cannot certify a month's free-plan compliance.

## Investigated versus deferred datasets

| Dataset | Decision |
|---|---|
| DISEBSP, BOAV, BOALF, BM references | Implemented and fixture-tested now |
| PN | Existing reviewed source/mappings retained; no duplicate PN ingestion added |
| BOD / ISPSTACK | Official routes inspected; not used for monetary headlines. ISPSTACK includes adjustments and non-unit identifiers, so treating it as a simple asset action ledger would be wrong |
| REMIT | Existing official data/service references inventoried. Cancellation, revision and asset identity validation belongs in Phase 3 before any outage publication; no unverified outage adapter shipped |
| Wind/solar forecasts | Official current/day-ahead/history routes inventoried; preserve vintage and coverage reconciliation in Phase 5; no duplicate current forecast path introduced |
| Unit generation | Existing measured-history integration retained; do not relabel PN/BOALF as metered history |
| NESO constraints | Repair current adapter and observation-health reporting, reuse existing page |
| NESO day-ahead wholesale prices | Later economics adapter; existing market-index price is not substituted for day-ahead price |
| Demand flexibility | Explicitly deferred per plan |

The source investigation is scoped to the first Grid Operations release, not an assertion that every endpoint in the roadmap is implemented or licensed identically. REMIT and future financial datasets retain their own verification gates.

## Licensing and source verification

Official rendered Elexon endpoint documentation and real responses are saved. The Elexon BMRS open-data licence redirects successfully to `https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/`; reuse requires attribution and no suggestion of endorsement or misleading interpretation. Third-party/personal-data exemptions remain. NESO dataset metadata identifies its Open Data Licence; its original source URL and metadata are preserved. Existing licence links are retained. No copied competitor data is used.

## Reproduction

```sh
npm run build
node --test tests/*.test.mjs tests/security/*.test.mjs
npx playwright test tests/grid-operations-browser.spec.ts
node scripts/probe-grid-operations.mjs 2026-10-25
node scripts/exercise-grid-operations.mjs
```

Probe/exercise are read-only official-source requests with local output. The probe samples three periods, not every action in the day. Install PGlite in an external temporary tools directory and pass its module path to `scripts/test-grid-operations-db.mjs` to rerun the isolated database exercise. Deno check: `deno check supabase/functions/grid-operations-ingest/index.ts`. Do not run a live migration to reproduce the tests.

## Rollout review / remaining gates

1. Review this PR and the 64/250 MiB budget. Keep feature flags absent/false.
2. Apply the reviewed migration, deploy the authenticated function without a schedule, inspect actual Supabase permissions. PGlite is not hosted Supabase acceptance.
3. Run one authorised production ingest, compare selected source records and price/volume reconciliation, check allocated storage, source latency and last-good failure handling.
4. Only then enable bounded scheduling and monitor several publication cycles plus storage/egress growth. Do not enable new polling by simply merging this branch.
5. Phase 2 adds the reviewed UI/home preview and small bounded read views; it does not reopen report publication or expose unsupported costs.
6. Rollback: disable the operations function/route flags and its future job first. Leave raw evidence available internally for diagnosis; do not drop tables as an automatic rollback. Existing national feeds and map remain independent.

Remaining Phase 0 issues are not concealed: layout-shift remediation, current-number initial HTML, physical-device/accessibility/field performance and Search Console metrics need separate work. Report-source/accounting discrepancies still block new reports. This data-foundation PR does not claim to fix those unrelated product paths.
