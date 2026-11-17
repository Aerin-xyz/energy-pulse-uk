# Source-faithful reports — 17 November 2026

Prepared for review; **not deployed**. Independent repair branch based on current `main`; no dependency on unmerged PR #15 and no new Supabase jobs/tables.

## Exact cause

The mandatory NESO Historic GB Generation Mix comparison resource `f93d1835-75bc-43e5-84ad-12472b180a98` returned no records for 16 November. Its latest record was **4 November 2026 23:30 UTC**, confirmed with a descending-date query. The old validator therefore rejected every report day in 11–16 November as missing NESO coverage. It was not an Elexon generation outage or proof of incorrect current metered readings. Saved responses are in `evidence/`.

NESO's separate Demand Data Update resource `177f6fa4-ae49-4182-81ea-0c6b35f26ca6` has complete embedded solar/wind estimates for the new seven-day window. Its retained field metadata explicitly calls both figures **estimates**, in MW. An `A` outturn row does not make these estimates metered readings.

## New publication contract

- Seven **complete Europe/London days**, ending on the previous local date. No silent six-day “week”. All UTC instants retained; settlement helpers handle 46/48/50 periods.
- Metered generation is built directly from retained Elexon FUELHH observations, not the old aggregate feed. Resolve revisions by publication time; fail on missing values, unknown fuel types, off-grid intervals and conflicting equal revisions. Each interval's average MW × 0.5 hours gives MWh.
- Denominator includes the named domestic metered fuel categories but **excludes imports and pumped storage**. Wind + natural hydro share excludes biomass. This is deliberately **not** the live site's renewable grouping or a whole-system total; the scope is visible.
- NESO embedded solar and wind are separate optional modules. Require every expected settlement period and valid numeric values; duplicate intervals fail. Forecast rows are excluded, but selected outturn estimates remain labelled estimated.
- Carbon uses the Carbon Intensity API's published actual intervals, no forecast substitution. Its whole-window mean is duration-weighted, not consumption-weighted or marginal emissions.
- A missing optional module withholds its totals/rankings without blocking a complete metered module. Missing metered intervals still block the report; no gaps become zero. No optional estimate is added to a metered share.
- No unverified cross-provider equality requirement. No claim of independent meter certification. The legacy validator remains available for reproducing older archives; its earlier checks were not retroactively weakened.
- Recent readings are explicitly provisional/source-revisable. Hashes, raw compressed responses, retrieval times, Elexon publication timestamps, normalized dates, module errors and validator hash are retained in a content-addressed evidence pack. NESO lacks per-row publication time in this response; it remains null.
- Existing published report/date identities are frozen. Repeat collection saves new revision evidence but does not silently rewrite the report or its associated generated summaries. Editorial corrections remain an explicit future publication process, not an automatic date rewrite.
- Reports have the actual compilation date as publication date, separately from their covered period.

## Verification

**133 regression/security tests passed (13 new module tests), two responsive browser checks passed, production build and TypeScript passed.**

Sample: **10–16 November 2026**, 7 days / 336 half-hours.

- Metered energy excluding pumped storage: **4,936,620 MWh**.
- Average metered generation: **29,384.642857 MW**.
- Energy-weighted wind + natural hydro share: **27.7572306558%**.
- Separate solar estimate: **218,529 MWh**; separate embedded-wind estimate: **228,386.5 MWh**.
- Published actual carbon-intensity time mean: **158.7470 gCO₂/kWh**.
- An independently written Python calculation reproduces all 3,024 primary fuel/interval values and the energy/share arithmetic from the raw Elexon response. This independently checks our arithmetic, **not** the underlying meters.
- Replaying the saved pack verifies hashes and all daily/module calculations without network access.
- Tests cover missing primary/optional data, null/blank/zero values, unknown fuel schemas, revisions, conflicts, estimate duplicates, forecast exclusions, malformed responses, whole-window withholding and DST.
- Browser preview checks 390 and 1366 px, data/definition visibility, working evidence link, no overflow or application errors. Screenshots retained. Build and TypeScript checked.

Earlier initial-HTML tests assumed the September report would always be latest. They now pin historical checks to the specific frozen archive entry, while deriving current-summary assertions from the actual current dataset. All original archive entries/figures remain unchanged.

## Reproduce safely

```sh
node scripts/replay-report-validation.mjs docs/report-repair/fixture/source/manifest.json
python3 docs/report-repair/validation/independent-recalculation.py docs/report-repair/fixture/source
node scripts/test-report-preview.mjs
npm run build
node --test tests/*.test.mjs tests/security/*.test.mjs
```

The preview script temporarily installs the retained fixture, builds and runs two browser checks, then restores all original publication files even on failure. Do not run concurrent builds in the same worktree. Screenshots use this fixture, not a production report.

Read-only official-source generation into an isolated output directory:

```sh
REPORT_OUTPUT_ROOT=/tmp/energy-report-check REPORT_END_DATE=2026-11-16 node scripts/generate-weekly-report.mjs
```

The Elexon publication-time query is split into bounded four-day slices because a request exceeding seven days is rejected by the official endpoint. The slices cover the reporting window through retrieval, retaining later published revisions. At most seven report days are fetched; each response has a 30-second/16-MiB bound. Existing daily scheduling is unchanged. Retries occur on the next scheduled/manual run; no tight retry loop or extra recurring job is introduced.

## Rollout and limits

Review this report-only PR, then deploy after approval. The existing daily workflow will invoke the new generator; validate its first real result and evidence links before calling production repaired. No historical backfill or mass rewriting is authorised/performed. Existing forecast/cost failures and PR #15 remain separate.

Only the source data as retrieved can be reproduced exactly. These checks cannot guarantee the underlying meters or estimates are physically exact, and later source revisions may change results. NESO secondary comparisons remain unavailable where its historical resource is stale; we do not invent an independent corroboration score. Constraint expenditure is not added to this generation report. Production scheduled execution, source retention beyond the provider's current API window and field/device performance are not verified by this local review.
