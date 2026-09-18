# GB grid evidence — first release, 18 September 2026

**Local branch only:** `feature/gb-grid-evidence-first-release`. No push, deployment, secret entry, infrastructure provisioning or live schedule activation is authorised or performed. Deployment requires the user's approval. Existing site design, map modes, interconnectors, public routes and historical exploration are retained.

## Audit and implementation decisions

Inspected the React/Vite routing, three shared-layout families, GridAtlas, command-centre metric cards, EnergyDataContext/Supabase integrations, cable and asset feeds, historical-generation hook, gridMetrics/cableReadings/assetReadings and settlement helpers, static snapshot/prerender generators, existing source-integrity notes and daily refresh workflow. Current branch started from `origin/main` d61f727 with clean working tree.

Findings and treatment:
- Demand previously used a mixed-interval generation + imports + storage supply balance; the backend may return zero-filled stubs. The focused homepage now uses official **INDO initial national demand**, not a reconstructed demand claim. The saved snapshot uses the same helper.
- Existing homepage generation included embedded estimates while historical comparisons did not. Focused homepage mix/share/history and briefing now use the **same completed FUELHH intervals** and explicitly exclude embedded estimates. Legacy Explore views are retained and have their existing scope; they are not inputs to the new explanation. Carbon, market price and legacy country aggregates retain their independent existing source clocks.
- Browser cable polling previously contacted Elexon per visitor. It now reads the shared backend cache; observation/publication times remain intact. Five-minute cable observations and half-hour evidence remain visibly different intervals.
- B1610 unit output is delayed settlement MWh, converted to half-hour average MW. FUELHH/FUELINST are MW and are not multiplied by two. Site histories retain settlement-run revisions and content hashes. Missing, failed or unverified matches are not zero.
- The 47-site map catalogue was a broad register snapshot. Six reviewed sites are now the default (Drax, Hornsea One, Torness, Whitelee, London Array, Moray East). Existing catalogue remains selectable, but unreviewed/ambiguous matches do not assert output. Seagreen/Dogger Bank A stay explicitly ambiguous. No further asset expansion.
- A single canonical register now holds stable `gb:<id>` IDs, DUKES site codes, explicit REPD reference IDs, BM unit IDs, mapping status, review date and exclusions. The earlier inventory JSON is retained for compatibility/evidence only, not read by the new map or ingestion. No fuzzy automatic matches.
- No Omnia requests or scraping. No vessel, global or 3D work. No AI-generated numbers or causal explanations; deterministic evidence templates are sufficient for this release.

## Source contracts verified on 18 September

### NESO — direct CKAN API

Base `https://api.neso.energy/api/3/action/`. Package metadata and field-schema samples are captured in `source-audit/`.

1. `day-ahead-constraint-flows-and-limits`; datastore resource `38a18ec1-9e40-465d-93fb-301e80fd1352`. Fields: `Constraint Group`, `Date_ Time GMT_BST`, `Limit_MW`, `Flow_MW`. Day-ahead flow is **modelled forecast**, not actual flow. The corresponding limit is a published directional snapshot, not a permanent thermal rating. Provider says weekdays daily, coverage past three years plus current year. Fetch latest 4096 records, filter time-valid next 48 hours in the shared calculator. Raw UK civil time is converted explicitly; ambiguous/nonexistent DST times are rejected, not guessed. Exact duplicates deduplicate; conflicting duplicate keys become unavailable. Known boundary direction diagrams are linked, not traced into invented transmission geography.
2. `operational-transparency-forum-network-congestion-data`; resource `aa9d4303-b7ec-4881-be07-16bad8824ab6`. Weekly rolling six-month backward/forward **boundary limits** in MW. Columns `… - Actual` are historical capability limits, not measured flows. Forecast and historical columns stay separate. All boundary names remain as published; no unsupported joining of code systems.
3. `thermal-constraint-costs`; latest financial-year data resource discovered from package metadata (currently `c730b788-4328-43dc-9f84-27fd3adeda59`). Weekly publication; daily GBP outturn for significant groups only. UI shows latest published day per group. No summation into an assumed complete GB total or conversion to curtailed MWh. Source may revise past costs; content-addressed raw revisions retained in ingestion cache.

Licence verified: NESO Open Data Licence, https://www.neso.energy/data-portal/ngeso-open-licence. Required attribution included: **Supported by National Energy SO Open Data**. Resource `last_modified` is labelled modification time, never invented row publication time. Row publication time is absent in these contracts and remains null. Snapshot retrieval time is separate.

### Elexon — direct Insights API

`https://data.elexon.co.uk/bmrs/api/v1/datasets/{FUELHH,INDO,FUELINST}` using publication-window query parameters; current requests verified HTTP 200. Six-hour cache window. FUELINST five-minute MW observations; FUELHH half-hour average MW; INDO half-hour initial national demand MW. All retain `startTime`, `publishTime`, dataset and raw fuel code. Only completed periods and revisions already published are eligible; latest publication wins, conflicting same-publication values become null.

Transmission-metered domestic generation is the complete set WIND, NPSHYD, BIOMASS, NUCLEAR, CCGT, OCGT, COAL, OIL, OTHER. PS is a separate signed metered pumped-storage reading. Negative reported values are retained; it is not primary generation or a battery state-of-charge estimate. Ten separate interconnector codes (including INTVKL and INTIRL) form signed net imports; positive is into GB. Missing one cable makes the aggregate unknown. Northern Ireland is external to GB domestic generation. Embedded wind/solar estimates are not added, so no double counting; this means these totals are **not all-generation/whole-economy electricity**.

`datasets/B1610?settlementDate=…&settlementPeriod=…` and `reference/bmunits/all?format=json` verified. Last available end-of-day asset sample in this run: 9 September, not real-time. Unit publication time is not supplied; preserve null, settlement run and content hash. Complete same-interval unit coverage required. Current pilot unit IDs checked against the official register; source-ID/status checks never auto-approve a changed mapping.

Licence verified from https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/ (text excerpt saved). Required attribution included: **Contains BMRS data © Elexon Limited copyright and database right 2026.** No provider endorsement claimed.

### DESNZ REPD and DUKES

REPD current official download discovered from https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract (current publication Q2 2026, not assumed monthly just because of URL). Explicit pilot REPD IDs: Drax 174/175/192/6659, Hornsea One 2525, London Array 2511, Moray East 2534, Whitelee 3489/3981/2757. Torness is nuclear and uses DUKES, not a fabricated REPD entry. REPD verified record extracts are saved. Source IDs/status revalidated by backend job, download discovery daily and source body cached seven days. Installed capacity remains dated to its source, not inferred from output. Government data: Open Government Licence v3.0, attribution/links retained. Original DUKES May 2026 and Q2 REPD definitions/discrepancies documented in prior register evidence.

## Architecture and operation

- `src/lib/evidence/calculations.mjs`: pure shared numerical/temporal definitions for homepage mix/traces, comparisons, forecast summary and network view. Existing correct settlement-time and asset/cable helpers reused.
- `scripts/ingest-grid-evidence.mjs`: server-side fetch, provider schema checks, last-good preservation on failures, atomic published cache, provider modification vs observation/publication clocks, resource IDs and SHA-256 revisions.
- `scripts/evidence/cache.mjs`: TTL source cache and immutable content-addressed raw revisions. Cache is local/CI backend storage, not committed raw megabyte downloads. CI cache retention is finite; this is not a permanent multi-year revision archive.
- `scripts/verify-canonical-assets.mjs`: official REPD/registry identity and operational-status checks for reviewed pilot. New/changed/ambiguous units require review.
- `public/data/grid-evidence.json`, `generation-assets.json`, `asset-verification.json`: cached outputs, shared by viewers. Browser never retrieves the new NESO feeds or cable source directly.
- `.github/workflows/grid-evidence-ingestion.yml`: prepared 15-minute scheduled backend job; source TTLs avoid refetching slow sources every tick. It remains **inactive** until approved code is deployed and `ENABLE_GRID_EVIDENCE_INGESTION=true` is explicitly enabled. No infrastructure secrets are required by the public feeds. Existing unrelated daily workflow is not activated/changed by this local branch.
- `/network-constraints/`: three separate evidence categories, source/freshness/revision details, exact tables and an accessible forecast plot. Crawlable explanation and canonical URL prerendered.
- Homepage: preserved command-centre design and map, small reviewed default, search/catalogue preserved, evidence briefing with explicit no-causal-inference language.

## Reproduce locally

`npm run verify:assets` → `npm run ingest:grid` → `node scripts/generate-asset-snapshot.mjs` → `npm run build:local` → `npm run test:metrics` → `npx playwright test tests/network-evidence.spec.ts tests/generation-map.spec.ts tests/atlas.spec.ts tests/site-system.spec.ts tests/power-flow-layout.spec.ts`.

No deployment command is part of these steps. `npm run build:local` is deterministic against saved caches; `npm run build` retains the existing broader report-generation pipeline.

## Limitations / review gates

Provider latency remains visible; cached forecasts can expire. NESO does not supply per-row publication times in these inspected datasets. Asset metering is settlement-delayed. No curtailment inference, no facility-level explanation from a boundary forecast, no joining non-equivalent boundary codes, no forecast/actual claim from weekly OTF labels. Legacy Explore/Supabase integrations remain available but are not migrated wholesale; existing backend authentication and source-zero fallback issues are documented, not silently claimed fixed. The new homepage calculation path does not consume their generation/demand stubs. Broader asset coverage and project pipeline remain deferred. Approval required before push/deployment or enabling the scheduled publisher.

## Validation results

18 September 2026, local feature branch:
- `npm run test:metrics`: **29/29 passed**, including settlement days, asset aggregation, signed negative storage, interconnector coverage, missing values, revisions, failed refresh retention and DST ambiguity.
- TypeScript `npx tsc --noEmit`: passed.
- `npm run build:local`: passed; **155** crawlable static HTML routes. Existing Vite large-chunk advisory remains; no build errors.
- Playwright selected full product regression suite: **29/29 passed**, including 40 public-route family checks at desktop/mobile widths, pilot/catalogue map selection, interconnectors, motion, all three constraint categories, expired forecasts, missing data, archive identity and no-JavaScript definitions.
- Direct local ingestion succeeded for all six evidence datasets; six pilot source-identity checks passed. These are verified requests and local artifacts, not a claim that the scheduled production job is active.
- Desktop/mobile screenshots visually reviewed, saved at `/home/aerins/.openclaw/workspace/artifacts/energy-mix-grid-evidence-2026-09-18/` (`home-desktop.png`, `home-mobile.png`, `constraints-desktop.png`, `constraints-mobile.png`).
- No push, deployment or live workflow activation performed. Saved snapshots age honestly until ingestion runs again. Existing live site is unchanged.
