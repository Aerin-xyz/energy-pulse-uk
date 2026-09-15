# Generation map — 15 September 2026

Eight curated major sites: Drax biomass units 1–4 (not retired coal 5–6 or gas auxiliaries), Hornsea One (three units), Sizewell B, Torness, Whitelee including extension, London Array, Peterhead production units, Dinorwig. This is explicitly a selected-sites layer, not a comprehensive inventory.

Geography: approximate station/farm centres from the linked Wikipedia articles in src/data/atlas/generation-assets.json, inspected 15 September. Country outlines remain Natural Earth. No surveyed footprints or individual turbine telemetry. Capacity: sum of the selected unit registrations in the public Elexon registry, not site nameplate/available capacity. Registry evidence preserved here, with explicit unit list in each detail panel.

Data source: https://data.elexon.co.uk/bmrs/api/v1/datasets/B1610?settlementDate=2026-09-07&settlementPeriod=48&format=json
Registry: https://data.elexon.co.uk/bmrs/api/v1/reference/bmunits/all?format=json
B1610 is settlement energy (MWh per half-hour), converted to interval average MW by multiplying by 2. It is not FUELINST or a physical notification/forecast. Observed 15 September: September 8–14 end-of-day queries returned no readings; September 7 returned readings. The UI therefore says metered history, not live, and never animates asset markers as live telemetry.

Build refresh scans previous 14 completed GB settlement dates for an available end-of-day interval, then retrieves its final 12 periods. It does not assert this is the latest partial-day interval in the provider. UK DST handled by existing settlement helpers. Point timestamps derive from the requested settlement period, not retrieval time. Site totals require every mapped production unit at the exact interval; null is not zero. Revisions use settlement run maturity, not additive duplicate rows. Signed storage readings retained. No national totals modified. The public snapshot is only the reduced 8-site data, not the full registry/feed.

On provider failure, the prior dated snapshot remains intact and checkedAt is not advanced. Generation layer loads it on activation. Existing daily refresh workflow updates and commits this file. No Supabase functions or credentials required. To extend inventory, verify unit identity/operational grouping and geography first; don't pull in retired registry entries automatically.

Verification: TypeScript, production build/152 static routes, 15 metric/archive tests, and 14 browser tests including generation mobile/desktop/filter/missing/expanded-map behaviour and existing atlas regressions. Local map previews saved in artifacts/energy-mix-generation-2026-09-15. Existing external validation warnings and backend authentication blocker unchanged.
