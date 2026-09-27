# Energy Mix atlas UX review

**Review branch only. No deployment or main-branch merge is authorised by this delivery.**

## Baseline and scope

The working brief is the detailed request posted on 27 September 2026. No separate audit attachment was accessible; this report does not claim to have read one.

Baseline: `9baaffb7630ecbb3a7468c264ccdb4bf1693d9fa` on `origin/main`, associated with the successful Cloudflare Pages production check at 18:04:17 UTC. See [release check](results/deployment-baseline.json), [production bundle fingerprints](results/production-assets.json), and [real production browser observations](results/before-browser.json). The implementation is isolated in `feature/atlas-ux-review`; the earlier freshness work and its separate local report remain untouched.

### Confirmed versus proposed

| Finding | Evidence | Treatment |
| --- | --- | --- |
| Half-hour MW tooltip formatted as GWh | Existing `CustomTooltip` called `formatGWh` for both series | Explicit power/energy formatter and rendered chart tests |
| “Output above 100 MW” filters capacity | Filter uses installedCapacityMW | “Sites above 100 MW installed”, active capacity chip |
| Search result below initial viewport | Drax search in production at all seven recorded sizes | Visible desktop inspector / mobile sheet |
| Key controls/labels 8–10 px | Computed styles in production baseline JSON | Readable controls, evidence and screen-aware asset markers |
| Different selection routes and losing context | Existing component-local state, separate map/list interfaces | Shared selection handler, router/session state, focus restoration |
| More refined workspace and quieter geography | Design proposal, not a measured production defect | Larger map, one inspector, progressive clusters and shared fuel palette |

## Changes

- **Correctness:** MW → GW only for power; MWh → GWh only for daily energy. Legacy daily API property names remain unchanged, with an explicit boundary contract. Zero and negative values remain meaningful; missing values do not become zero. Forecasts are separate, with no new interpolation through missing forecast records.
- **Truthful source state:** national status uses observation availability, age and refresh/fallback state. Last-good values remain visible and dated after a failed refresh. Initial national demand is labelled consistently. No claim of live internal transmission flows.
- **Search and filters:** immediately visible results, persistent query, clear active filters/reset, installed-capacity action, same asset evidence and centring from map/list/search. The full catalogue, reviewed subset and existing evidence gaps remain.
- **Mobile:** one modal search/filter/detail surface, focus containment/restoration, viewport-aware height and safe-area CSS. Compact navigation plus all-section menu. Embedded touch scrolls the page; expanded mode explicitly enables panning and pinch zoom. Zoom and direction buttons provide non-drag alternatives. Expanded exit remains reachable.
- **State:** selected asset, layer, camera, query and filters are represented in the URL/router and session memory. Back/Forward and route return restore context. Pan frames are local; end-of-gesture writes replace history rather than flooding it. Original asset URLs still resolve.
- **Desktop:** map-first workspace, source inspector adjacent to controls, national summary immediately below the map with observation-basis controls beside its values. Repeated header summary removed; useful charts and analysis retained.
- **Cartography/charts:** shared semantic fuel palette, screen-aware marker sizing and cluster grouping; larger count badges and progressive labels. Historical charts use tap/click inspection and a native period selector for keyboard/touch access to the same formatted values.
- **Architecture:** keep SVG, existing data hooks, caches, Supabase/Cloudflare ingestion, attribution and URLs. Consolidate map layout rules in `immersive-map.css`, removing competing legacy selectors rather than adding another override file.

## Review evidence

Paired captures use the same viewport and search action. `before/` is the real production site; `after/` is the local review build. These are actual browser captures, not mock-ups. Source values and observation ages can differ between capture times; use the JSON timestamps. Do not interpret a local frozen API snapshot's age as a production freshness measurement.

| View | Before | After |
| --- | --- | --- |
| 360 × 800 | [Map](before/360x800.png) · [Search](before/360-search.png) | [Map](after/360x800.png) · [Search](after/360-search.png) |
| 390 × 844 | [Map](before/390x844.png) · [Search](before/390-search.png) · [Detail](before/390-detail.png) | [Map](after/390x844.png) · [Search](after/390-search.png) · [Detail](after/390-detail.png) |
| 430 × 932 | [Map](before/430x932.png) · [Search](before/430-search.png) | [Map](after/430x932.png) · [Search](after/430-search.png) |
| Tablet 768 × 1024 | [Map](before/768x1024.png) · [Search](before/768-search.png) | [Map](after/768x1024.png) · [Search](after/768-search.png) |
| Laptop 1366 × 768 | [Map](before/1366x768.png) · [Search](before/1366-search.png) | [Map](after/1366x768.png) · [Search](after/1366-search.png) |
| Desktop 1440 × 1000 | [Map](before/1440x1000.png) · [Search](before/1440-search.png) | [Map](after/1440x1000.png) · [Search](after/1440-search.png) |
| Desktop 1920 × 1080 | [Map](before/1920x1080.png) · [Search](before/1920-search.png) | [Map](after/1920x1080.png) · [Search](after/1920-search.png) |

Interaction recordings and final measured results are listed in [validation](VALIDATION.md).

## Preserved integrations and limitations

- No ingestion, Supabase cron, edge cache, history endpoint or source credentials changed. All network reads during this work were read-only. No new paid service or map engine.
- Installed capacity is not production. Notifications are plans, not metered actuals. Delayed asset history stays dated. Network geography remains static mapped infrastructure. Country aggregates, cable observations and regional forecasts remain distinct.
- Google Tag Manager bootstrap is unchanged. A fresh production Chromium session contained the GTM script but exposed no consent buttons or consent storage keys. Provider-managed consent settings and accepted/rejected states could therefore **not** be validated here. This is not a claim that consent is correctly configured.
- Physical iOS Safari/Android devices were unavailable. Chromium/CDP touch, pinch, reduced viewport and keyboard checks are **emulation**, not real-device acceptance. WebKit could not launch due to missing host libraries. Physical safe areas, OS keyboard behaviour and Safari gestures remain release gates.
- No field INP/LCP/CLS p75 dataset was available to this session. Lab measurements are separate and do not establish the field targets.
- The existing bundle-size warning remains. SVG is retained; changing map technology before representative device profiling would be premature.

## Reproduce locally

```sh
npm ci
npm run build:local
node scripts/serve-atlas-review.mjs
# in another terminal
npx tsc -p tsconfig.app.json --noEmit
node --test tests/*.test.mjs
npx playwright test --config playwright.review.config.ts
REVIEW_URL=http://127.0.0.1:4175 REVIEW_PHASE=after node scripts/capture-atlas-review.mjs
```

The local preview proxies and caches read-only public API responses; it is not a new production data path. Build before running browser tests, not while they are reading `dist`. For performance/axe scripts install axe-core in the temporary tools directory documented in their source.

## Release review

Final upstream check: `7317e21151ddf6e0a95544dc5aad6466fcdfe3e5` adds only the scheduled official-data refresh to the baseline; no application-code changes. Those generated data files are not modified by this branch.

Review the paired evidence and physical-device/consent gaps before approving a deployment. This branch uses Cloudflare's documented `[CF-Pages-Skip]` commit prefix to avoid an automatic preview deployment. No automatic release should be inferred from opening the draft PR. After approval, use the normal reviewed merge/release process; validate public data freshness and GTM/consent again in production.
