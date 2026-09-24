# Operational GB generation catalogue — 24 September 2026

## Release
The generation map now defaults to the broader operational register instead of the reviewed eight-site pilot. Capacity is optional (including above 500 MW); search, technology, country, evidence and ordering controls remain available. Register data loads separately from the application bundle only when generation is opened. Spatial grid clustering, viewport culling and a paginated accessible list bound rendering work. Existing stable site URLs and verified Elexon mappings are retained.

## Official coverage
- DESNZ REPD Q2 2026 CSV, discovered from the official monthly-extract publication page: operational generating projects in England, Scotland and Wales.
- DUKES 5.11, operational at end of May 2026, discovered from the official electricity statistics page: additional major conventional stations.
- 2,884 register entries on first ingestion: 1,382 solar; 699 onshore wind; 423 biogas; 97 hydro; 80 energy from waste; 77 biomass; 62 gas; 47 offshore wind; four nuclear station groups; four pumped-storage sites; seven marine and two geothermal.
- These are register entries, **not a claim of 2,884 unique whole power stations or a complete GB generator census**. Verified grouped phases retain their established IDs. Other source phases remain separately identified. No national capacity total is inferred from this catalogue.
- Northern Ireland, proposed/closed records, standalone batteries and non-generating storage technologies are excluded. Pumped storage remains explicitly identified as storage. REPD record 1616 is excluded for missing/invalid location. 21 records retain unknown capacity as null.
- Coordinates use source OSGB grid references converted to WGS84; approximate register points, not surveyed footprints. Offshore points can identify a project/connection area.
- Open Government Licence v3.0 attribution appears on the map. Source downloads, revisions, retrieval time and exclusions are stored in public/data/operational-assets.json.

## Generation evidence
Eight reviewed Elexon site mappings remain unchanged. Delayed B1610 metered history and PN notified schedules remain distinct. New register entries have no guessed BM-unit match and show capacity/location only. Missing output is not zero; no capacity-based generation, schedule/output curtailment or causal inference is introduced.

## Ingestion and reliability
npm run ingest:catalogue discovers official files, parses REPD and the latest operational DUKES sheet, validates identities, transforms coordinates, applies explicit crosswalks and writes atomically. Failure preserves the previous catalogue. The weekly GitHub workflow shares the existing data-publisher concurrency group and checks out the latest main before publishing. It can also be manually dispatched. The browser retains the curated 47 entries with an explicit warning if the catalogue fetch fails.

## Acceptance
37 calculation/register/ingestion tests and 36 browser tests; TypeScript app check and production local build. Browser coverage includes both phone and desktop, small solar sites, optional capacity filtering, stable source-ID URLs, clustered selection, list pagination/clipping and source failure. Existing cable, constraints, archive and public-route checks remain in the suite.

## Limitations
Quarterly/monthly register publication is not real-time operating status. No automatic new asset-to-unit matching has been attempted. Official registers have gaps and phase/location inconsistencies. Broader map coverage does not imply broader measured-generation coverage. This release does not change the eight reviewed output mappings.
