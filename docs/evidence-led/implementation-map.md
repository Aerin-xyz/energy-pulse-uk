# Evidence-led implementation — 25 October 2026

Review branch from 3928684. User brief is the working specification; production changes require review. Existing features are preserved, not assumed missing.

| Backlog | Existing implementation | Planned extension / evidence |
|---|---|---|
| B01 | scripts/prerender-static.mjs, StaticGridSnapshot, generate-static-snapshot, evidence cache | Truthful initial fallback; no competing stale numbers; source/HTML status checks |
| B02 | Index/StaticPageLayout/metadata pipeline | Stable identities, correct page type, remove false JSON downloads |
| B03 | ElectricityObservatory, GridCommandCentre, GridAtlas | Four primary metrics and fuel mix ahead of map; responsive composition |
| B04 | StaticPageLayout, CoreExplainers, Glossary, Data, Methodology, prerender | Substantive explanations without JS |
| B05 | gridMetrics, evidence calculations, HistoricalGenerationChart | Source-specific clocks, explicit DST labels and fixtures |
| B06 | reportValidation, Reports, generate-weekly-report, frozen archive | Visible period/partial labels; preserve dates, figures and failed gate |
| B07 | command-centre/immersive-map/observatory CSS, fuelColours, inspector | Unified hierarchy, controls, contrast and keyboard verification |
| B08 | GridAtlas/register loading, lazy historical chart | Intent-based map payloads; repeatable lab comparison |
| B09 | CarbonIntensityCard, carbon outlook regional records | Non-overlapping regional rankings; separate aggregates |
| B10 | routes, static prerender redirects/sitemap, internal Links | Canonical crawl and direct links; no speculative route deletion |
| B11 | HistoricalGenerationChart, URL-backed map state, existing share scripts | Frozen, timestamped citation/CSV/SVG with basis and provenance |
| B12 | CommandNavigation, AtlasMobileNavigation, SiteFrame, About | Live/Explore/Learn/Reports grouping; source link; no invented operator credentials |
| B13 | GridAtlas/AtlasInspector, useAssetExplorer | Preserve search/list/filter state; clear scope and capacity-only fields |
| B14 | existing measure/audit/capture scripts, source workflows | Reproducible baseline, lab metrics and explicit unavailable private/physical checks |
| B15 | Optional future features | Deferred by brief until core gates and operational ownership; no new accounts/alerts/tariffs |

## Preservation contract
Retain URLs/redirects, data definitions, measured vs notified vs capacity, near-live vs half-hour, UTC keys, forecast duration controls, source clocks, motion pause, atlas inspector/search/filter/camera history, historical non-hover inspector, GB scope and archived corrections. No threshold weakening or invented values.

## Baseline and limits
Live E07–E11 will be rechecked with fresh HTTP and Chromium before changes. Private Search Console/field analytics and physical VoiceOver/iOS/Android are not implied available. Record observed results separately from requirements and proposals. No deployment or URL consolidation justified by search assumptions.
