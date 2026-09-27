# Validation evidence

## Automated checks

- **61 Node calculation/source/state tests passed** (`node --test tests/*.test.mjs`).
- **64 Playwright browser tests passed** at the end of the full regression run. [Machine-readable report](results/regression.json).
- TypeScript `npx tsc -p tsconfig.app.json --noEmit` and production-mode `build:local` passed; 165 static routes prerendered. Existing large-chunk warning retained.
- Axe WCAG A/AA tags through 2.2: **zero detected violations in eight rendered states** (map, filters, search, detail at 390 px and 1366 px). [Full scan including checks requiring human review](results/after-accessibility-states.json). This is not a declaration of full WCAG conformance.
- Seven viewport captures: no document horizontal overflow; Drax result visible without scrolling at every size. Before, the result was below the viewport at every recorded size. See [before](results/before-browser.json) / [after](results/after-browser.json).
- Keyboard focus containment and restoration, Back/Forward, initial-history Back, navigation away/return, no pan-history flooding, sequential typing, touch scroll versus expanded pan/pinch, zoom/pan buttons, reduced-motion and missing/expired/failed-refresh states are covered.
- Historical power/daily energy inspector and actual tap tooltip checks cover **10.0 GW versus 240.0 GWh** from explicit test fixtures. Fixtures are not presented as public observations. Signed/zero/missing contracts are tested separately.

## Controlled local lab comparison

Three fresh Chromium mobile contexts per build; 390×844, 4× CPU slowdown, 150 ms latency, 1.6 Mbps download / 0.75 Mbps upload. Runs were sequential, after other browser suites finished. Baseline is the pristine deployed commit served at 4176; review build at 4175. Both use the same cached read-only public API responses. Local static delivery is uncompressed and GTM is host-gated off; these are **not production network conditions**.

| Measure | Baseline | Review |
| --- | ---: | ---: |
| Median lab LCP | 2.00 s | 2.02 s |
| Median lab CLS | 0.000 | 0.000 |
| Median first network + asset layer readiness | 24.96 s | 24.94 s |
| Longest sampled interaction Event Timing duration | 192 ms | 272 ms |

[Baseline raw timings](results/baseline-lab-performance-accessibility.json) · [Review raw timings](results/after-lab-performance-accessibility.json). The raw reports also retain transferred bytes and long tasks.

LCP here is dominated by early page content and is **not** proof that the full asset catalogue is interactive. The layer-readiness probe waits for network geometry and first asset markers, not every downstream feed. Event Timing samples are a short search interaction, not field INP. Three runs are insufficient to establish p75 field compliance. The requested LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 field targets therefore remain **unverified**, not declared achieved. The earlier [production lab baseline](results/before-performance-accessibility.json) is preserved but is not used to claim a speedup over localhost.

The first review run exposed 440–480 ms search-opening delays. Memoising the unchanged energy-context value reduced these to 272 ms in all three repeat runs; sequential-typing samples topped out at 192 ms. This removes unnecessary chart notifications during URL edits without changing fetching or refresh schedules. The remaining 272 ms modal-opening sample is slower than baseline and above the 200 ms target: it remains a review limitation, not a claimed performance pass. [Initial regression measurements](results/iteration1-performance-accessibility.json) are retained.

No map-engine replacement or broad performance rewrite was undertaken. The evidence supports profiling realistic devices and complete catalogue readiness next rather than extrapolating from the page heading alone.

## Actual interaction recordings

- [Production mobile baseline: search → evidence](before/video/390-search-detail.webm)
- [Review mobile: search → evidence → filters → expanded map, pinch and Back](after/mobile-interactions.webm)
- [Review desktop: search → evidence → filters → pan/zoom and Back](after/desktop-interactions.webm)
- [Expanded mobile screenshot](after/mobile-expanded.png) · [Expanded desktop screenshot](after/desktop-expanded.png)

These are real Chromium recordings, not mock-ups and not recordings of physical phones. Paired stills and their timestamps are indexed in [README](README.md).

## Outstanding physical-device and release checks

1. Physical iOS Safari: notch/home-indicator safe areas, OS keyboard open/close, pinch and one-finger page scroll, VoiceOver, reduced motion.
2. Physical Android Chrome: keyboard resizing, TalkBack, gesture/Back behaviour and low-end hardware responsiveness.
3. Provider-managed GTM/consent: initial, accepted and rejected states. Production inspection confirmed GTM loaded, but no consent controls were available in the inspected fresh session; configuration was not modified or inferred.
4. Representative field p75 LCP/INP/CLS and broader desktop/tablet accessibility review. Axe returned some manual-review items; no blanket accessibility certification is claimed.
5. Review and approve the branch before deployment; then verify public freshness, attribution, analytics and archived URLs once more against the deployed build.

## Deliberate non-changes

No Supabase cron, ingestion schedule, API implementation, geography dataset, asset matching, official-source payload, licence, analytics bootstrap or production configuration changed. No fabricated asset history, network telemetry, causal interpretation or zero-filled missing readings introduced.
