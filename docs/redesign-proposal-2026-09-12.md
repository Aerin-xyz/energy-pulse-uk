# Energy Mix — Britain’s electricity, live, explained

Status: discovery and product/design proposal; no product implementation or deployment.
Reviewed 12 September 2026. Repository baseline: `7545445`.

## Recommendation

Build a **public electricity observatory with an editorial voice**: the immediacy of a live map, the clarity of a good news briefing, and evidence that can be inspected and cited. The organising unit is the electricity story, not the dashboard card.

The first visit should answer three questions in ten seconds: what is powering Britain, what is unusual or changing, and where to explore next. Returning visitors should recognise the system’s changing state without learning a new layout.

The supplied image is direction for atmosphere and hierarchy, not a source of facts or capabilities. Borrow its dark depth, luminous geography and precise typography. Discard its cockpit sidebar, wall of equally weighted panels, invented operational alerts, regional GW figures, battery charge percentage and transmission telemetry.

## Discovery coverage and limits

- Inventoried all page modules, application routes, components, hooks, scripts, edge functions, database migrations, workflow/configuration, static content and existing test surface. Traced the public live/history/forecast/report paths in detail; newsletter/social/admin systems were reviewed as preserved boundaries, not exercised.
- Read the existing reconciliation and external-validation reports, SEO/growth documentation and earlier source-freshness audit.
- Checked HTML responses and canonical/title coverage for 36 concrete public routes plus two dated-report probes; all 38 fetched successfully. Successful HTTP responses do not establish correct content: old and invalid report paths returned homepage metadata.
- Rendered the live homepage at 1440px desktop and 390px mobile, inspected screenshots and extracted text; additional rendered route-family checks are in the evidence directory.
- Inspected a real public live response fetched at 12:50 UTC. Checked the committed daily validation artifact, not a newly executed external validation suite.
- No claim of exhaustive line-by-line review, upstream accounting reconciliation, accessibility certification, runtime verification of outbound systems or production/backend deployment parity.
- Browser installation and dependency installation were local review setup only. Existing production code is unchanged.

## What is worth keeping

Real public-source integration; Elexon FUELINST with fallback handling; embedded-generation enrichment; generation filters and GW/% controls; historical and weekly charts; interconnector detail; the accessible conceptual power-flow view; regional/postcode carbon exploration; explanatory routes; daily/weekly summaries; citation and methodology pages; newsletter and share tools; crawlable generated HTML; external daily validation; existing analytics events.

The present product already has a “Now” summary. Its weakness is not lack of widgets: desktop repeats numbers across a header, flow diagram, donut, charts and static snapshot. Mobile has no page-level horizontal overflow in the checked viewport, but becomes a very long sequence of repeated cards. The signature flow graphic occupies only a small part of its desktop container; the map does not yet exist.

## Integrity findings that shape the design

### 1. Demand changes definition and crawlers see a different number

`src/lib/powerFlowDemand.ts` uses raw demand unless the supply-balance derivation differs by more than 2,500 MW, then switches definition. `generate-static-snapshot.mjs` still uses raw API demand. In the reviewed response, raw demand was 24,417 MW and the browser’s derived display was about 34,796 MW. These are not interchangeable measurements.

Proposal: separately named transmission demand and **estimated GB supply-balance demand**, with explicit equations, coverage, storage treatment and loss limitations. Select one stable headline definition only after reconciliation. Never change semantic meaning because a numerical tolerance was crossed. An accounting residual remains visible in the evidence view; do not force every flow diagram to balance by relabelling its residual as measured demand.

### 2. Percentages do not have a shared denominator or classification

The edge payload adds imports to generation-mix percentages while keeping domestic `totalGenerationMW`. The live header excludes biomass from renewables; the static snapshot includes it. Weekly generation uses wind/solar/hydro and historical code can classify pumped storage as hydro. Live wind has embedded enrichment that the historical path does not consistently share.

Proposal: distinguish domestic generation from electricity supply including gross imports. Publish one fuel taxonomy and versioned definition per metric. Keep biomass explicit; keep pumped storage outside primary renewable generation. Do not compare live and historical shares until coverage matches. Renewable and low-carbon are separate concepts, with their category lists visible.

### 3. Per-source freshness exists, but “live” remains too broad

The earlier missing `sourceFreshness` issue is partly fixed: the production response now includes it. However, wind and demand had null source timestamps while labelled live; interconnectors were labelled live with an 11:00 UTC timestamp in the 12:50 UTC fetch. Generation was 12:40 UTC; station load was 08:30 UTC. The envelope was assembled at 12:48 UTC. `asOf.endISO` was 13:00 UTC: not a valid last-observed timestamp at fetch time.

Proposal: retain interval start/end, observation/publication time, retrieval time and derivation time separately. Interval end can legitimately be in the future; it cannot be labelled “last observed”. Source age, quality and operating mode must be separate fields. Cached enrichments retain their original ages. Missing provenance means unknown freshness, not live.

### 4. The carbon outlook is not currently an outlook

The endpoint requests `/intensity/date` then slices the first 24 periods. The reviewed response’s forecast range was 11 September 23:00 UTC to 12 September 11:00 UTC: entirely past at fetch time. The `actual || forecast` expression can replace a valid zero and present forecast as actual. The 233 gCO₂/kWh comparison baseline is hard-coded without a dated baseline definition.

Proposal: fetch/filter an explicitly future horizon; preserve actual versus forecast provenance with null-safe handling. No cleaner-window recommendation without future coverage. Describe cleaner as lower forecast carbon, not cheaper or guaranteed household savings. Wind/solar forecast code also needs source-field, revision and horizon acceptance before publication.

### 5. Transfer representation needs correction before a map amplifies it

The reviewed payload contained 2,922 MW gross imports and 3,848 MW gross exports: 926 MW net exports. The power-flow detail labelled 3.8 GW “Net transfers”. The static builder labels gross positive imports as net imports. BritNed’s zero was shown as unavailable despite a live status. Greenlink displayed 103% of its capacity hint. France is a country aggregate across IFA/IFA2/ElecLink, not three measured link values.

Proposal: explicit positive-into-GB convention at the normalisation boundary; separate gross import, gross export and signed net. Zero, absent and unavailable are distinct. Reconcile capacity hints and source mappings before utilisation claims. Map France as an aggregate until individual verified data exists. Check upstream sign conventions and temporal alignment before interpreting these mixed-age values as a physical balance.

### 6. Historical validation is useful but narrower than “all verified”

The committed 12 September validation for 11 September reports `warning`: Elexon and NESO demand checks pass, but NESO generation-mix comparison returned no periods. The generator permits warnings. A minimum 46-period rule is not a complete UK settlement-day check, particularly around 46/48/50-period DST days and duplicate/missing intervals. Weekly high records are recent-feed daily averages, not all-time national records. Historical carbon is currently a disclosed proxy in reports.

Proposal: expose pass/warning/failure and exact coverage. Validate unique intervals and expected local settlement-day length. Label records by window and resolution. Do not infer carbon minima from renewable share or gas alone.

### 7. Permanent insight URLs are not yet permanent evidence

`Reports.tsx` falls back to the latest report for any unknown date. Prerendering only includes the latest generated report. Both an old date and an impossible date returned homepage metadata in the HTML check. A browser visit to `/reports/weekly/2026-05-11` then rendered the 12 September report, confirming the fallback is visible to readers. That can turn a citation into another day’s story after navigation/hydration.

Proposal: an append-only dated report archive with source snapshot IDs, definition versions, coverage and correction history. Known old URLs retain their exact material or an honest archive-unavailable page; unknown dates get an actual 404, not the latest report. Reconcile trailing-slash canonicals and sitemap entries against a single route manifest.

## Information architecture

Top-level navigation: **Live · Explore · Briefings · Learn**. Sources/methodology and newsletter remain easy to find without competing with the main story.

| Destination | Job | Existing URLs preserved |
| --- | --- | --- |
| Live | Understand the system now; map and current briefing | `/`, `/power-flow` |
| Explore | Investigate generation, demand, carbon, markets, storage and transfers | Existing generation, fuel, carbon, demand and interconnector URLs |
| Briefings | Today, yesterday, weekly reports and permanent insights | `/today`, `/yesterday`, `/reports`, `/reports/weekly/:date`, `/insights`, `/records` |
| Learn | Clear answers, definitions, sources, limitations and citations | `/uk-electricity-mix`, existing explainers, `/glossary`, `/data`, `/methodology`, `/citation` |

Navigation labels do not require moving existing URLs. Proposed additive routes: `/grid` for full-screen map exploration, `/wholesale-electricity-price` for the verified market-index product, `/pumped-storage` for the supported storage scope, and `/insights/YYYY-MM-DD/slug` for durable briefs. Do not create empty destination shells. `/power-flow` remains the complementary accounting/schematic view, not a misleading redirect to geography.

## Homepage concept: the living electricity atlas

### First screen

The masthead is quiet: Energy Mix, four destinations, source status. The editorial headline is large and readable: **Britain’s electricity — live, explained.** Below it, one data-backed sentence about the current mix, with a time and a “See the evidence” link.

The centrepiece is an expansive, accurately drawn GB map against near-black sea. It occupies roughly two-thirds of the desktop hero; a compact **Now** briefing occupies the remaining third. A national generation composition bar sits beneath the map; it is not falsely distributed across regions.

Three map modes, only where their data passes acceptance:

1. **Connections:** directional arcs between GB and neighbouring systems. Width has a stated flow scale; arrowheads and labels work without animation. Country aggregates remain aggregates. Routes are schematic, not actual cable or transmission paths.
2. **Regional carbon:** a properly attributed boundary layer keyed to Carbon Intensity API region IDs, visibly labelled forecast. National aggregate regions must not be drawn or ranked as if they were disjoint local regions. Verify region definitions, boundary licence and postcode API coverage first.
3. **Change:** only time-aligned historical data available for the selected layer. No playback slider that implies absent regional or link history. Until those archives exist, changes use national time-series views outside the map.

Northern Ireland appears geographically but is visually differentiated as part of the separate all-island electricity market. It is not added to the GB headline totals. Selected region/connection opens a compact detail panel with interval, source, units and limitations. An equivalent keyboard-accessible list gives every useful value without map interaction.

### The four-part briefing

- **Now:** largest sources, demand definition, carbon and transfer state. Three or four decisive facts, not another complete metric tape.
- **What changed:** up to three ranked changes versus an explicit baseline such as the last comparable hour. Use same-source/definition comparisons, show signed magnitude and prior/current intervals; suppress claims when comparability fails.
- **Why it matters:** one useful interpretation tied to the evidence. Distinguish observed co-movement from proven causes. Negative market-index prices do not mean free household power; high renewables do not prove a particular operational event.
- **What happens next:** an actual forecast strip with “issued at”, valid horizon and observed/forecast boundary. Offer the lowest-carbon contiguous window for a selected duration only within returned coverage. Missing forecast becomes a concise unavailable state and a useful explainer, not invented copy.

Each statement expands to its underlying chart and links to methodology. No free-floating generated “why” text. Initial editorial selection can be deterministic rules with thresholds, interval checks, deduplication and evidence IDs; reviewed evergreen explanations provide the interpretation.

### Below the hero

One coordinated “Today’s rhythm” time-series explorer, not six unrelated mini charts. Generation uses a stacked area with inspectable values; demand gets a separate compatible panel; carbon and price retain their own units and axes. Shared time cursor, explicit data gaps and a table alternative. Avoid misleading dual axes.

Then a compact shelf of permanent briefs and relevant explanations. One restrained newsletter invitation after value has been delivered. Source status is available throughout; detailed operational diagnostics are not part of the consumer flow.

## Design system

| Element | Proposed rule |
| --- | --- |
| Palette | Ink `#061119`, sea `#081923`, raised surface `#10232D`, text `#EDF4F3`, muted text `#A6B9BD`; cyan `#43D9E6` for interaction, mint `#71DAB6` for selected clean-energy context, amber `#F3C46D` for caution. Validate contrast in the actual components. |
| Fuel colours | Wind mint, solar amber, nuclear lavender, gas coral, hydro blue, biomass olive; imports neutral cyan-grey and storage distinct blue-violet. Categories keep one colour everywhere; operating state is not encoded by colour alone. |
| Typography | Self-hosted licensed humanist sans, proposed Source Sans 3; tabular numerals and IBM Plex Mono only for compact evidence/measurement labels. Headlines 48–64px desktop / 32–38px mobile; body 16–18px; essential labels at least 12–14px. |
| Composition | Map and editorial typography carry hierarchy. Few enclosing cards, fine dividers, 8px spacing rhythm, 12–16px corner radii. No glow on body text, no neon borders on every panel. |
| Motion | 160–240ms UI transitions; slow flow markers only on fresh verified connections. Stop for stale data, offscreen/hidden tabs and reduced-motion preference. No particles pretending to be measured electrons; no count-up from zero. |
| Voice | Precise, curious, lightly British. “Wind is doing the heavy lifting” is permissible when supported; “the grid is stressed” is not inferred from one frequency threshold. No “healthy” system badge without an actual system-health definition. |
| Evidence | Every metric supports value/unit, scope, definition, source, observed/forecast/estimated/cached state, valid interval, source age and an evidence link. Share cards retain the timestamp and geographic scope. |

## Mobile is a different composition

Order: one-sentence Now briefing → a legible 280–340px map stage → strongest change → next valid cleaner window → deeper exploration. Four thumb-friendly destinations; no horizontal metric ribbon containing essential facts. Map interactions open a bottom sheet rather than hover-only labels. The legend is compact and explicit. Scrolling remains ordinary page scrolling until the user enters full-screen map exploration.

44px minimum interactive targets, keyboard parity, visible focus, 200% zoom acceptance, no colour-only indicators and a reduced-motion/static map equivalent. A user can understand the complete headline story without dragging, zooming or opening a tooltip.

## SEO/AEO and permanent evidence

Retain useful routes and their search intent. Replace separately hand-written crawler summaries with the same versioned content and metric model rendered for everyone. Ship meaningful HTML before client data arrives; hydrate/enhance it without switching metric definitions. Freshness must be honest when a build snapshot ages. Prerender explainers and archive entries; choose server/edge rendering or a suitably refreshed public snapshot for Live after checking hosting constraints. A framework rewrite is not a prerequisite.

Topic pages: direct short answer → current or dated evidence → explanatory chart → definition and caveats → related question links. Give overlapping pages distinct jobs: evergreen explanation versus today’s measured context. Use Article/Breadcrumb/WebSite/Dataset structured data only where the visible content genuinely fits; do not invent dataset downloads or claim guaranteed rich results. Keep social/admin/measurement workflow surfaces out of public navigation and indexing as appropriate.

A permanent brief stores observation intervals, publication/update dates, source identifiers, metric-definition version, chart data, validation/coverage state and corrections. The same snapshot drives its HTML, share card and downloadable evidence when licensing permits. A comparison or map selection may use shareable URL state, but only archived snapshots promise historical replay.

## Metric contract and implementation order

Canonical value shape: `metricId`, `value | null`, `unit`, `geography`, `definitionVersion`, `sourceId`, `intervalStart`, `intervalEnd`, `publishedAt`, `retrievedAt`, `kind`, `freshness`, `coverage`, and source-specific quality flags. Derived values additionally carry input snapshot IDs and derivation version. Round for display, not before aggregation. Null is not zero. Preserve negative wholesale prices and signed transfers.

1. **Correctness foundation:** reconciliation fixtures; taxonomy/denominators; source-time and forecast rules; demand naming; transfer sign/zero/capacity checks; settlement/DST coverage; immutable archive behaviour. The public redesign must not conceal unresolved inconsistencies.
2. **Visual prototype:** local desktop and mobile map-led homepage using verified, explicitly dated snapshots. Verify map/boundary attribution and actual payload granularity. Preserve `/power-flow` and existing functionality.
3. **Product integration:** shared metric model across Live, Explore, briefings, generated HTML and share artifacts. Add evidence panels, truthful degraded states, editorial comparisons and future-valid outlooks.
4. **Acceptance and release preparation:** production build/required validation without invoking auto-push scripts; targeted metric regressions; keyboard/reduced-motion checks; browser acceptance at 390/768/1440px; no-JS content parity; historical URL retention/404s; metadata/sitemap checks; performance measurements. Deployment is separate from local implementation.

Target acceptance: clear headline meaning in ten seconds; no repeated contradictory metrics; preserved useful controls and URLs; no unsupported operational telemetry; map usable as a list; no fabricated chart gaps/history; forecasts never drawn as observations; past reports stable; per-source stale states survive refresh. Performance targets: LCP ≤2.5s, INP ≤200ms and CLS ≤0.1 at p75, validated through lab work initially and field data when available, not claimed achieved by a mockup.

## Review decision

Recommended direction: **a living electricity atlas plus an evidence-led public briefing**, not a command centre. The first implementation should prove the map, hierarchy, mobile composition and definition contract together. This document is the requested proposal checkpoint before product implementation; no external publication has been performed.

## Saved review evidence

- `redesign-evidence-2026-09-12/live.json`: public response inspected at 12:50 UTC.
- `redesign-evidence-2026-09-12/routes.json`: public route and metadata probes.
- `redesign-evidence-2026-09-12/page-inventory.json`: page-module inventory.
- `redesign-evidence-2026-09-12/rendered-pages.json`: eight rendered route-family checks.
- `redesign-evidence-2026-09-12/home-rendered.txt`: live homepage text.
- `redesign-evidence-2026-09-12/desktop.png` and `mobile.png`: inspected existing-site screenshots.
