# Energy Mix evidence-led review — 25 October 2026

Review-only implementation of the supplied brief, based on commit `3928684`. Production is unchanged. Read this alongside [the component mapping](implementation-map.md), [freshness details](freshness.md), [correctness details](correctness.md) and [measurement boundaries](measurement-boundaries.md).

## Phase delivery

| Phase | User-facing result | Evidence and limitations |
|---|---|---|
| 0 — discovery | Reproduced September initial HTML versus October browser data before editing; inventoried existing controls and contracts. | Fresh HTTP responses and two live baseline screenshots in `baseline/`. No private analytics inspected. |
| 1 — information contract | Old competing headline snapshots removed; useful initial explanations plus explicit unavailable state; one identity graph; no false JSON download. DST labels, forecast completeness, partial archive labels and regional boundaries corrected. | Nine initial-content unit checks, three browser scenarios, correctness fixtures. Initial values intentionally remain unavailable until client fetch, not falsely current. Archived numerical errors are disclosed, not silently recalculated. |
| 2 — national-first interface | Four national metrics and labelled mix precede optional atlas on mobile, sit beside it on desktop. Five mobile destinations; preserved map search/expansion/Back, reduced motion and duration controls. | Seven widths, map interaction and keyboard tests; four axe scans. Physical devices/VoiceOver remain unverified. |
| 3 — useful content and reuse | Actual glossary/method/data/topic/report HTML; stable schema and canonical links; frozen CSV/JSON/SVG/citation exports with period, basis and source; history selection in URL. | 154 routes receive actual component SSR, all167 receive metadata/static content. Thirteen remaining explanatory shells are listed in `freshness.md`; no claim of complete content parity for them. |
| 4 — delivery cost | Atlas/register/network and history-chart work deferred until intent or a shared selection. National answer does not depend on them. | Same-server three-run-per-width lab results, not field CWV or INP. No claim of search/traffic uplift. |

## Backlog disposition

- **B01–B06:** implemented primary acceptance paths: truthful initial availability, schema, national hierarchy, priority SSR, DST and coverage. A fresh numerical server/edge response is not implemented: the brief's honest unavailable alternative is used. Report source discrepancies remain blocking; 124 six-date archives have explicit partial labels, original values/dates preserved.
- **B07:** shared summary/control hierarchy, keyboard/reduced-motion and automated checks implemented; manual assistive-technology and physical-device acceptance still outstanding.
- **B08:** intent loading implemented and measured. No speculative worker/geometry rewrite; finer register splitting is deferred pending profiling of the opened atlas.
- **B09:** non-overlapping regional ranking, separate country aggregates, postcode/failure fixtures implemented.
- **B10:** generated canonical/link/schema checks implemented. No route deletion, invented sitemap dates or Search Console setting changes. Full production redirect/host crawl remains a release check.
- **B11:** selected generation and history CSV/JSON/SVG/citations implemented. No PNG dependency or new public API contract. Existing archive supports bounded24h/7d views; unsupported30d/custom comparison promises are not added.
- **B12:** grouped navigation and honest proposed-partner wording implemented. No invented operator biography; private query/user-task baselines require maintainer access.
- **B13:** existing search,60-row list pagination, filters, capacity/evidence distinction and map state preserved; clarified register-wide search scope. No unsupported operating-status inference.
- **B14:** reproducible tests, screenshots, lab data and separate HTML/cache/source diagnostic added. A new recurring alerting service, private analytics and field measurements are not claimed.
- **B15:** deferred as instructed: light theme, alerts/accounts, tariffs and widgets/API commitments.

## Verification and reproduction

From repository root:

```sh
npm run build
npx tsc -p tsconfig.app.json --noEmit
node --test tests/*.test.mjs
# Serve built review on4185; baseline3928684 on4186 with scripts/serve-atlas-review.mjs.
npx playwright test -c scripts/evidence-led/playwright.config.mjs tests/evidence-led-product.spec.ts tests/initial-content.spec.ts tests/evidence-correctness.spec.ts
node scripts/evidence-led/check-layout.mjs
# Set AXE_SCRIPT to a locally installed axe-core/axe.min.js.
node scripts/evidence-led/accessibility-product.mjs
# Run alone, after other browser/build jobs have finished:
node scripts/evidence-led/measure-product.mjs
```

Final unit suite: **100 passed**. Integrated product/initial-content/correctness browser suite: **19 passed**. Separate correctness and existing chart/home-context/carbon regression run: **15 passed** (overlaps the18; not34 unique tests). Build and TypeScript pass. Four axe states have zero detected violations, with contrast/ARIA items needing human review; this is not WCAG certification. Seven widths have no document overflow or application errors.

`performance-both.json` is the final12-run comparison; earlier phase-only files were exploratory and are not the final comparison. Screenshots preserve the observation times actually returned; delayed data is labelled, not restamped as current.

## Release / rollback

No database migration, privileges, source cadence, report validation threshold, archived data or production service is changed. Review/approve before release. Use the normal build and all-days publication gate; a source-validation failure must continue to withhold new reports. Do not deploy regenerated report figures by bypassing that gate.

Rollback is a code revert and rebuild, without deleting archives. Preserve truthful unavailable/archived labels if selectively rolling back UI. Verify raw HTML, carbon actual/forecast, national source clocks, map search/Back, forecast gaps, history URLs and evidence exports after deployment. Confirm production redirects and response headers separately; local browser success is not production verification.

Outstanding external acceptance: real iOS/Android/VoiceOver, representative user tasks, Search Console/indexing and field CWV, source redistribution/licensing review for broader distribution, recurring monitoring ownership. These are not silently marked complete.

## Issues caught during acceptance

- Upstream success-shaped/non-array responses could crash a module; shape/status guards now leave unrelated readings usable.
- Independent review corrected demand wording to INDO, added full half-hour boundaries/definition versions to exports, retained missing fuels as null and restored directly linked history selections.
- The first controlled lab run exposed mobile CLS0.262. Trace evidence identified the obsolete homepage shell, unreserved source/fuel space and late font swap. The homepage now SSRs the real layout, unknown fuel rows/source-label space are reserved and the existing28KB font is preloaded. The isolated trace after fixes measured0.008; final repeated results are in the [performance comparison](performance.md). This was a real regression fixed before review, not omitted from the evidence.

Final lab medians: mobile LCP2.376s / CLS0.008; desktop LCP2.420s / CLS0.002. LCP is approximately0.35s slower than baseline in this uncompressed lab; initial decoded resources fall from8.0MB to1.5MB. See [full performance results](performance.md) for ranges and limitations.
