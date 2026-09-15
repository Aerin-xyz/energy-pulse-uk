# Generation map — 15 September 2026

Eight curated major sites: Drax biomass units 1–4 (not retired coal 5–6 or gas auxiliaries), Hornsea One (three units), Sizewell B, Torness, Whitelee including extension, London Array, Peterhead production units, Dinorwig. This is explicitly a selected-sites layer, not a comprehensive inventory.

Geography: approximate station/farm centres from the linked Wikipedia articles in src/data/atlas/generation-assets.json, inspected 15 September. Country outlines remain Natural Earth. No surveyed footprints or individual turbine telemetry. Capacity: sum of the selected unit registrations in the public Elexon registry, not site nameplate/available capacity. Registry evidence preserved here, with explicit unit list in each detail panel.

Data source: https://data.elexon.co.uk/bmrs/api/v1/datasets/B1610?settlementDate=2026-09-07&settlementPeriod=48&format=json
Registry: https://data.elexon.co.uk/bmrs/api/v1/reference/bmunits/all?format=json
B1610 is settlement energy (MWh per half-hour), converted to interval average MW by multiplying by 2. It is not FUELINST or a physical notification/forecast. Observed 15 September: September 8–14 end-of-day queries returned no readings; September 7 returned readings. The UI therefore says metered history, not live, and never animates asset markers as live telemetry.

Build refresh scans previous 14 completed GB settlement dates for an available end-of-day interval, then retrieves its final 12 periods. It does not assert this is the latest partial-day interval in the provider. UK DST handled by existing settlement helpers. Point timestamps derive from the requested settlement period, not retrieval time. Site totals require every mapped production unit at the exact interval; null is not zero. Revisions use settlement run maturity, not additive duplicate rows. Signed storage readings retained. No national totals modified. The public snapshot is only the reduced 8-site data, not the full registry/feed.

On provider failure, the prior dated snapshot remains intact and checkedAt is not advanced. Generation layer loads it on activation. Existing daily refresh workflow updates and commits this file. No Supabase functions or credentials required. To extend inventory, verify unit identity/operational grouping and geography first; don't pull in retired registry entries automatically.

Verification: TypeScript, production build/152 static routes, 15 metric/archive tests, and 14 browser tests including generation mobile/desktop/filter/missing/expanded-map behaviour and existing atlas regressions. Local map previews saved in artifacts/energy-mix-generation-2026-09-15. Existing external validation warnings and backend authentication blocker unchanged.

## Superseding expansion — above 500 MW, 15 September 2026

The initial eight-site scope above is superseded by **47 GB sites with installed capacity strictly greater than 500 MW**. Installed capacity, not current output or BM-unit registration capacity, determines eligibility. Source snapshot: DESNZ DUKES 5.11, operational list as at end May 2026, published 30 July 2026. Cross-check: Q2 2026 REPD operational records. This is coverage of these register snapshots, not an assertion of an exhaustive real-time operating-asset register. Northern Ireland, interconnectors, proposed projects, and planned uninstalled capacity are excluded. No qualifying operational solar or stand-alone battery project was identified in these extracts.

- DUKES: https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes
- Workbook: https://assets.publishing.service.gov.uk/media/6a6a365b0ddb7e4831c629f3/DUKES_5.11.xlsx
- REPD: https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract
- CSV: https://assets.publishing.service.gov.uk/media/6a6cbdc00c36759b5ccaa305/REPD_Publication_Q2_2026.csv
- Elexon registry: same public reference endpoint above; source rows refreshed in registry.json.
- Relevant official source rows and geographical source records preserved in over-500mw-register-extract.json. Government data reused under Open Government Licence v3.0; https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

Grouping: Heysham 1+2, Keadby 1+2, Whitelee I+II, Clyde South+Central+North and Walney 01–04 are grouped as named sites/complexes. Other units group under their named station/farm. This avoids missing >500 MW sites whose individual phases are smaller. Drax continues to exclude retired coal and auxiliary gas units. No unit is assigned to two sites. Dogger Bank A's DUKES installed portion is 616 MW, not the planned 1,200 MW; its commissioning mapping remains explicitly unavailable. Seagreen's unit grouping remains unverified and has no inferred output. Both remain visible as capacity/geography records. Other 45 mapped sites had complete readings at the checked 7 September end-of-day sample.

Differences are not silently blended: Hornsea Two DUKES 1,386 MW versus REPD 1,320 MW; Dinorwig DUKES 1,800 MW versus REPD 1,728 MW. The DUKES value consistently determines the threshold, with the differing figures disclosed in the asset panel. Whitelee DUKES 539.02 MW; Clyde 522.4 MW. Registers may differ in definitions/report dates. Registry generationCapacity is retained as separate evidence and never relabelled installedCapacityMW.

Geography: source British National Grid coordinates transformed to WGS84 via Airy/OSGB36 Helmert parameters (approximate, not surveying accuracy). Offshore REPD coordinates preferred where matched; remaining DUKES positions retained with register-geography caveat. Government-supplied positions can identify project/connection areas rather than farm centroids. Do not label these exact locations. The dense map groups markers within approximately 18 SVG units; counts denote nearby sites, not summed generation. Search/list preserves access to every record. Markers remain stationary dated history, not live telemetry.

Refresh is unchanged: daily end-of-day B1610 samples, same settlement-date/time integrity. Empty unit mappings now explicitly return null rather than the empty-sum zero. Added regression checks for register thresholds, site/unit uniqueness, capacity-source consistency, unmapped states, search, cluster selection and phone/desktop navigation.

Expansion verification: production build and 152 prerendered routes, TypeScript, 17 data/archive tests and 15 browser tests passed. Browser coverage includes 390/1440px generation search/filter/expanded map, nearby-site selection, explicit unmapped output, empty searches, plus existing atlas/cable regressions. Local overview screenshots are in artifacts/energy-mix-over-500mw-2026-09-15.
