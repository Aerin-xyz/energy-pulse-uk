# Electricity atlas implementation — 12 September 2026

## Delivery

Local branch: `redesign/living-electricity-atlas`. No remote push, frontend deployment, Supabase deployment or outbound newsletter/social action was performed.

Implemented:

- Map-led public observatory: accurately sourced country outlines, schematic country-level transfer arcs, regional carbon forecast markers, inspectable evidence and an expanded-map modal with keyboard dismissal/focus restoration.
- Separate mobile composition, self-hosted Source Sans 3 (OFL), stable source colours, restrained motion, reduced-motion handling, shared Live / Explore / Briefings / Learn navigation and an updated brand share image.
- Now / What changed / Why it matters / What happens next. Historical comparisons use completed comparable half-hours; future carbon windows require contiguous valid intervals and remain separate from tariff advice.
- Generation GW/% controls, source-specific ages, signed net transfers, wholesale-index and pumped-storage explanatory pages. Existing charts/filters live at `/explore`; `/power-flow` and existing explanatory URLs remain.
- Shared domestic-generation taxonomy and supply-balance demand calculation for the atlas and generated snapshot. No threshold-driven change between raw transmission demand and estimated supply-balance demand.
- Null/zero separation, future-source timestamp rejection, forecast-horizon handling, and UK settlement-time helpers. Backend source changes are prepared but are not running in Supabase until separately deployed.
- Restored 110 dated reports from repository history, retaining original report content and source commit provenance. Future report dates are append-only; no unknown-date substitution. Public HTML generation now covers 149 routes with a route-derived sitemap.
- Local Cloudflare Pages function for genuine unknown-report HTTP 404 responses. Known dates serve their own static HTML. Legacy alias URLs redirect to their retained equivalents; admin/share SPA routes are preserved.
- Report/archive and administrative code split away from the initial route. The initial main JS chunk is approximately 178 KB gzip; historical chart code remains a separate on-demand chunk. Local previews do not load GTM.

## Verification

- Full `npm run build` succeeded, including its external validation gate and static generation.
- `npx tsc --noEmit -p tsconfig.app.json` succeeded.
- Targeted ESLint checks of the new UI/hooks/pages succeeded.
- Nine metric/archive unit checks passed: signed gross/net flows, null versus zero, freshness, forecast continuity, renewable classification, DST lengths, observation-to-settlement conversion, and Pages routing.
- Thirteen browser tests passed: 390/768/1440px atlas interactions, reduced motion, unavailable sources, historical URL identity, no-JavaScript content, expanded-map keyboard behaviour, and five preserved power-flow layout viewports.
- Live public data verified in the local UI: future carbon window and 14 regional forecast regions returned successfully. Carbon API timestamp paths use unescaped ISO minute syntax; percent-encoded colons were rejected by the upstream service in browser checks.
- Local Cloudflare Pages runtime served the 11 May report with HTTP 200 and an unknown 1900 date with HTTP 404. This was exercised against the runtime, not inferred from a queued command or unit test alone.
- Automated axe WCAG 2 A/AA and 2.1 AA homepage checks found zero violations on desktop and mobile. This is not an accessibility certification.
- Inspected desktop/mobile screenshots and the regional layer. No browser page errors or mobile horizontal overflow in the final live-data check.
- The local, unthrottled development-browser observation was LCP 444 ms and CLS 0.007; these are diagnostic lab observations, not production field Core Web Vitals or an INP claim.
- Supabase edge-function changes passed TypeScript syntax transpilation. Shared settlement logic is regression-tested; full deployed Deno/upstream acceptance remains a release check.

## Integrity state retained, not concealed

The external validator returns **warning**, not all-green: the current deployed historical feed uses legacy UTC reporting days, and NESO historical generation comparison returned no periods for 11 September. The report artifact records both. UK-settlement-day handling is prepared for the updated backend; legacy feed days are not silently relabelled as UK settlement days.

Archived reports deliberately retain original renewable definitions and historical coverage (including legacy hydro/storage treatment). They are explicitly distinguished from the atlas’s domestic-generation shares. No all-time record claims or historical carbon minima were invented.

Country flows can cover different source intervals; capacity hints and anomalous utilisation still require upstream reconciliation. The map does not create per-cable measurements from country aggregates, transmission telemetry, national battery state of charge, or regional generation data. Regional display points are approximate centres, not administrative boundaries.

## Review artifacts

Saved outside the application repository at `/home/aerins/.openclaw/workspace/artifacts/energy-mix-redesign-2026-09-12/`:

- `homepage-hero.png`, `desktop.png`, `mobile.png`, `regional-carbon.png`
- `browser-review.json`

The original discovery evidence remains in `docs/redesign-evidence-2026-09-12/`. Country attribution is in `src/data/atlas/README.md`; font licence is in `public/source-sans-license.md`.

## Release order

Review the local changes and visual artifacts. A release needs the frontend/Pages function and the separately deployed `energy-data` / `historical-generation` Supabase functions, followed by source reconciliation, HTTP checks, mobile checks and the validated refresh. Do not invoke `refresh:daily` as a local test: that existing script includes an external push. Rollback point is the original repository baseline `7545445`.
