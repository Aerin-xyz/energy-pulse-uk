# Initial-content freshness, schema and crawlable depth

Reviewed and implemented locally on 25 October 2026. No deployment, push, publication, ingestion enablement or archive recalculation was performed by this workstream.

## Discovery before edits (B01/B02/B04; supporting B06/B10)

- `index.html` supplied a generic Dataset on every route, a JSON DataDownload pointing to the HTML homepage, and an Organization. `scripts/prerender-static.mjs` added another Organization on home or another Dataset on data/methodology. React page Helmet declarations repeated the dataset classification.
- `scripts/prerender-static.mjs` used a manually maintained short paragraph registry plus `src/data/staticGridSnapshot.json`. `StaticGridSnapshot.tsx`, CoreExplainers, Today and GridInsightPages kept the frozen snapshot visible in the browser; GridInsightPages also embedded its values directly in static cards.
- The interactive national data provider (`EnergyDataContext`) independently obtained `/api/energy-data`; evidence hooks used `/api/grid-evidence`. These existing pipelines were retained.
- Glossary, Data, Methodology and CoreExplainers already contained substantial actual React explanations, definitions and source tables. The old prerender did not render them.
- `generate-static-snapshot.mjs`, the existing daily validation workflow and explicitly gated hourly cache workflow were inspected. None was used to bypass the report validation/publication gate. No scheduler was enabled or edited.

### Public reproduction

Direct no-cache HTTP reads on 25 October reproduced E07/E09/E10/E11 on home, carbon, solar, today, glossary, data and methodology:

- Home/carbon/solar initially contained **2026-09-29 04:30:00 UTC** snapshot values.
- Today said **“Yesterday, Monday 28 September”**.
- Glossary initial HTML described definitions without serving its actual definition list; detailed source/methodology content was omitted.
- Homepage declared two Organizations; data/methodology declared two Datasets. All inherited the HTML-as-JSON download declaration.

Chromium at **2026-10-25 09:41:07 UTC** independently reproduced E08: carbon retained the 29 September saved card (20.8 GW national demand and 53% renewables) above an October live module showing **69 gCO₂/kWh** for the displayed 09:30 endpoint. These are historical audit observations, not present readings.

## Implemented information contract

The site is a static Vite build. There is no demonstrated request-time freshness service for its initial HTML. This release therefore deliberately chooses the brief's **honest unavailable** option instead of relabelling a build-time number as current:

- `src/lib/initialEvidence.mjs` defines a versioned unavailable state with null observation and GB scope. Initial live-route HTML embeds that exact state. `StaticGridSnapshot` now presents its explanation and source/report links, never old values.
- The browser provider starts with null data, matching that initial state, then may restore the existing browser cache and fetch newer observations. Retained/current readings still need their own source-clock labels; a cache-write time is not an observation time.
- Core explainers no longer have a competing static numerical module. Today and the five insight pages reuse the existing corrected LiveSeoModule instead of maintaining separate saved cards/calculations. The shared unavailable component remains on a source outage.
- Today, Yesterday and insight daily context use the archived absolute date, without changing the stored original summary or publication. Today explicitly says its current readings are not a completed local-day average/total.
- A realistic source-outage fixture exposed an existing `useGridSignals` failure: non-OK JSON objects reached array parsers and crashed the page. HTTP status and array-shape checks now retain unavailable signals instead.

This does **not** deliver current numerical values to JavaScript-disabled readers. It gives them truthful availability, substantive explanations, source links and dated archives. Enabling current server-rendered numbers later requires request-time or demonstrably bounded regeneration freshness; it must not restore unconditional frozen values.

## Content and schema delivery

- `src/prerender.tsx` uses the real React components, StaticRouter, Helmet and existing providers. API effects do not run during server rendering. It renders the same explanatory text for all users, not crawler-specific content.
- Full component rendering covers 27 evergreen/topic/index routes plus 127 archived reports (154 of the 167 generated routes). This includes the homepage and all nine core explainers, five live insight pages, Today/Yesterday, Glossary, Data, Methodology, Citation, Reports and the Records pages. The remaining 13 routes retain their existing static explanatory shells: `/network-constraints/`, `/about/`, `/newsletter/`, `/contact/`, `/privacy/`, `/insights/`, `/power-flow/`, `/social/`, `/measurement/`, `/partners/`, `/explore/`, `/wholesale-electricity-price/`, and `/pumped-storage/`. These are not claims of full initial/rendered parity for those 13 routes.
- The homepage now server-renders the actual Index/ElectricityObservatory national-summary structure with null readings, not the obsolete atlas introduction shell. This follow-up addressed the measured initial-shell typography/layout shift in the parent lab trace. The initial unavailable contract remains unchanged; there is no invented current data. Historical-cache reads are guarded for the server, and the obsolete duplicate Index WebSite declaration is removed. CLS improvements require the parent’s subsequent trace and are not inferred merely from SSR.
- Glossary has nine definitions and stable term anchors in initial HTML. Data contains its full source table and original provider links. Methodology exposes definitions, denominators, coverage and limitations.
- The correctness workstream's report-coverage annotations are server-rendered directly from Reports.tsx. Record highs additionally show the declared reporting window and state that they are not all-time records. Original archive JSON, figures and original publication dates are untouched.
- `RouteStructuredData` supplies stable Organization, WebSite and WebPage IDs on initial pages and client navigation. Report Article declarations reference the same publisher identity. The generic Dataset and invalid DataDownload are removed rather than inventing an aggregate export licence.
- No mixed-source licence is asserted by the shared schema. Source inventory pages are described as pages, not as one downloadable dataset. Actual documented distributions can be added separately after verifying their representation and rights.
- Initial internal links are canonicalised only when their target is a registered public route. Query/hash state is preserved; `/uk-electricity-mix` retains its intentional no-slash canonical. No redirects or existing URLs are removed.
- Sitemap remains 165 intended entries (167 generated routes minus the two existing noindex operational pages). No fabricated `lastmod` was added.

## Release check and verification

`npm run build` and `npm run build:local` now run `scripts/check-initial-content.mjs dist` after prerender. It fails if any of five representative live routes loses the explicit unavailable contract, reintroduces the saved headline snapshot/relative archive copy, or is missing. It is read-only and performs no network calls or publication.

`npm run check:initial-content -- --json` separately reports HTML file age, cache generated time, archived snapshot age, source check times, source refresh-failure flags and latest record timestamps. These are raw diagnostic ages, **not a new source-cadence alerting service**. Existing scheduler execution/cadence must still be monitored using its own run history. Forecast record times are not observation times. No recurrent external service has been added.

Completed local checks:

- `npm run build`: succeeded and generated 167 HTML routes, including server-rendered coverage annotations.
- `node --test tests/initial-content.test.mjs`: **8 passed** before the homepage structural regression was added. The new ninth test checks actual national-summary initial DOM and absence of the obsolete atlas shell; the parent runs the final combined build/tests. Checks shared null contract; substantive explanation/source links; actual glossary definitions; consolidated schema; absolute daily copy; publication dates; report/record coverage; sitemap and direct canonical links across all 167 generated pages.
- `node --test tests/seo-titles.test.mjs`: **2 passed** (existing title checks).
- `npx playwright test tests/initial-content.spec.ts --workers=1`: **3 passed**. JavaScript disabled still serves definitions/source table/explanations; failed sources retain unavailable content without the old snapshot; a fixture newer carbon interval replaces the unavailable state and leaves one schema identity graph.
- `npx tsc --noEmit -p tsconfig.app.json`: passed.
- `node scripts/check-initial-content.mjs dist`: passed for all five monitored live routes. The diagnostic correctly distinguishes the checked-in 25 October cache write from the preserved 29 September snapshot observation.
- `git diff --check`: passed.

The browser tests use local Chromium and deterministic fixtures; they do not certify real upstream uptime. No Search Console indexing inspection, rich-results test, live deployment status test, social-preview validation, screen-reader certification or search/traffic gain is claimed by this workstream. Public HTTP production remains unchanged until an approved deployment.

## Rollback and remaining scope

Revert the local implementation commit(s) and rebuild to restore prior UI/code. No archive deletion or data migration is required. Avoid restoring the false Dataset download declaration or publishing old values as current during a rollback.

Before deployment, run the normal report validation gate and the complete project release checks. External source licensing, regeneration operational ownership, private search/analytics baselines and real-user performance are separate verification tasks. The initial-content check enforces truthful representation, not current data availability. Registered links are normalised in initial HTML; a complete browser-navigation and HTTP redirect crawl is still a separate check.
