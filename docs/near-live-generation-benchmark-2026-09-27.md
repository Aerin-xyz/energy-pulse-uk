# Near-live national generation and dashboard comparison

27 September 2026. Implementation `67e4391`, coverage clarification `95405f5`. Backend `cache-warmup` version 45. No new schedule, paid service, or additional upstream fetch was introduced: the site already ingested FUELINST for cables.

## Product change

The homepage generation summary, fuel mix and renewable share now default to an **Elexon FUELINST five-minute observation**. A **Completed half-hour** control switches generation back to FUELHH. National demand remains INDO, storage history remains signed FUELHH, and evidence comparisons remain comparable completed half-hours. Each has its own timestamp; a half-hour endpoint must not be mistaken for an instantaneous reading at that endpoint.

The shared deterministic calculation selects one observation time, applies publication revisions, rejects future records, and withholds the total when domestic fuel coverage is incomplete. It does not fill missing categories with zero or borrow fuel values from older observations. Late readings stay visible and explicitly delayed. The canonical API retains existing half-hour top-level fields, adds a separately identified `nearLiveGeneration` object, and no longer declares completed-period data `isRealtime: true`.

Coverage: GB transmission-metered fuel categories. Embedded estimates, imports and pumped storage are excluded from the generation denominator. **Other can include battery output**; this release does not claim a complete battery split. No change to station-level PN versus delayed settlement-metered history.

## Verification

- 52 calculation/source tests passed, including new snapshot, revision/conflict, missing/zero, future/stale and metadata checks.
- 47 browser tests passed across full-suite and targeted reruns. Two new tests initially used an ambiguous accessible-name selector; this was corrected. Two old constraints tests depended on a rolling forecast still being future-valid; their clock is now explicitly pinned within the fixture forecast. Expired-forecast behaviour remains tested separately.
- TypeScript and production build passed. Desktop/mobile screenshots and browser comparison captures saved under `artifacts/energy-mix-near-live-2026-09-27` in the parent workspace.
- Live at 18:36 BST: both 390px and 1440px showed **27.4 GW, observation 18:25 BST, 11 minutes old**; switching showed the completed half-hour ending 18:30 (27.1 GW). No application errors or horizontal overflow.
- Scheduled backend run at 17:35 UTC completed successfully with all four source outcomes `ok`; public API returned the new snapshot and `isRealtime: false` for the completed-period payload.
- Direct official FUELINST check for 17:25 UTC, publication 17:30 UTC: biomass 2,813 MW, gas 5,472, hydro 469, nuclear 4,008, Other 1,314, wind 13,286, and coal/oil/OCGT zero. Sum **27,362 MW**, exactly matching our payload. Pumped storage 422 MW and interconnectors were excluded from this sum.

## Benchmark — public pages, not imported data

Read rendered pages and their public methodology during approximately 18:32–18:37 BST. This is a point-in-time comparison, not a measured long-term latency distribution or an audit of competitors' private pipelines. Competitor content is used only for comparison, not to populate Energy Mix.

| Dashboard | Observed evidence | Comparison with Energy Mix |
| --- | --- | --- |
| [Kate Morley: National Grid Live](https://grid.iamkate.com/) | Displayed 18:25 initially, 18:30 in the later check; gas 5.47 then 5.54 GW. [Public generation code](https://github.com/KateMorley/grid/blob/master/classes/Data/Generation.php) explicitly fetches FUELINST. Includes solar and a broader wind figure. | Same underlying five-minute national generation product. At the later check it had the next observation while our cache still held 18:25. Headline generation and renewable percentages have different coverage/denominators, so do not compare them as identical metrics. |
| [Gridwatch](https://gridwatch.templar.co.uk/) | Initial page labelled recorded 18:30: gas 5.47, wind 13.29, nuclear 4.01, biomass 2.81 GW; later recorded 18:35 with changed figures. | Initial rounded fuel readings match our official 18:25 observation. Its recorded/update clock is not automatically the same as our observation clock. Includes solar, imports and pumped-storage displays. |
| [Energy Dashboard](https://www.energydashboard.co.uk/live) | Advertises updates every 5–30 minutes. Generation mix labels 18:30 then 18:35; later total 34.53 GW. Mix explicitly includes imports, solar, PSH and battery output; power-flow panel also shows LV wind. Explains subtracting BESS discharge from Other to avoid duplication. | Broader supply/storage breakdown and historical tools. Its total is not directly comparable to our transmission-generation-only denominator. We have not independently verified the provenance/latency of every asset reading or its battery feed. |
| [Robin Hawkes: GB Renewables Map](https://renewables-map.robinhawkes.com/) | FAQ explicitly says generation uses Physical Notifications, which can diverge from actuals; experimental wind-based generation forecasts are synthetic. Rendered map has many smaller wind farms, time exploration and additional overlays. | Our asset notifications use the same type of planned-output evidence, not equivalent measured telemetry. Robin's wind-farm exploration is richer; our national FUELINST upgrade does not close all asset-experience or mapping gaps. No vessel/3D features added. |

## What remains

We now use the same five-minute national generation source class as established live dashboards, but **are not second-by-second telemetry and cannot claim to be the fastest**. At the comparative check our cache was one five-minute observation behind Kate's. Five-minute ingestion, edge caching and visible-tab polling can add latency; Elexon also publishes observations after their start time. Preserving the existing cadence avoids undoing the free-plan savings.

The strongest next opportunities are publication-aware refresh timing (without multiplying calls), an explicitly separate estimated whole-GB layer for embedded solar/wind, a verified battery split, and broader reviewed asset-unit mappings. Constraints are still forecast/published limits/retrospective costs, not live transmission telemetry. No curtailment is inferred from unused capacity or schedule differences.
