# Reference-led command centre revision — 14 September 2026

User instruction: the first redesign did not resemble the reference closely enough; rebuild as close to the supplied command-centre image as possible. Existing release authorization retained.

## Delivered
- Compact top bar and left navigation; three-column desktop command centre.
- Four metric panels, central luminous geographic GB map, interconnector table, wholesale price and evidence-based briefing.
- Bottom generation doughnut with working GW/% control, pumped-storage panel and actual carbon forecast trace.
- Regional carbon forecast callouts; decorative stippled country texture is not asset telemetry. Connection arcs remain explicitly schematic.
- Responsive map-first phone layout, scrollable navigation, accessible alternate map selection and keyboard-dismissable expanded view.
- Previous editorial explanations, future-window selector, history controls, permanent reports and source evidence retained below.

## Integrity boundaries
No invented substation/transmission telemetry, battery state of charge, operational alerts, system margin, frequency or market-price history. Demand displays its supply-balance components, not a chart for a different metric. Historical renewables and storage traces disclose their measured coverage. Missing readings remain unavailable. Existing undeployed Supabase fixes and validation limitations are unchanged.

## Acceptance
TypeScript, production build, 9 metric/archive tests and 13 browser tests. Browser review at 1440px and 390px; no horizontal overflow or page errors observed. Screenshots in artifacts/energy-mix-command-centre-2026-09-14 (workspace).
