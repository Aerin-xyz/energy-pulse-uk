# EnergyMix data reconciliation — 2026-05-12

Comparators checked:

- `grid.iamkate.com` / `KateMorley/grid`
- `energydashboard.co.uk/live`
- `energymix.info`
- Raw Elexon/NESO feeds used by the sites

## Main finding

EnergyMix was under-reporting displayed demand because it used BMRS `initialTransmissionSystemDemandOutturn` / ITSDO as the headline demand value. That field excludes embedded solar/wind and is not the same display definition used by `grid.iamkate.com` or Energy Dashboard for the live power-balance view.

For the public dashboard, the more comparable live demand definition is:

```text
Displayed demand ≈ domestic generation + net interconnector transfers + pumped-storage transfer
```

This matches Kate Morley’s implementation:

- `State\Demand` = `fossils + renewables + others + transfers`
- `transfers` includes interconnectors and pumped storage
- `generation` includes embedded wind and embedded solar, but excludes pumped storage and imports

Relevant iamkate source files:

- `/tmp/iamkate-grid/classes/State/Demand.php`
- `/tmp/iamkate-grid/classes/State/Transfers.php`
- `/tmp/iamkate-grid/classes/State/Generation.php`
- `/tmp/iamkate-grid/classes/Data/Generation.php`
- `/tmp/iamkate-grid/classes/Data/Demand.php`

## Live snapshot observed

At the check, `grid.iamkate.com` showed approximately:

- Time: 12:25
- Demand: 33.5 GW
- Generation: 29.8 GW
- Transfers: 3.7 GW
- Price: £63.60/MWh
- Emissions: 30 g/kWh
- Pumped storage: -0.97 GW

Energy Dashboard showed approximately:

- Generation mix total: 37.456 GW
- Total demand: 36.14 GW
- Net demand: 34.36 GW
- GB production: 32.05 GW
- Imports: 5.11 GW
- Pumped storage: 1.04 GW shown in the demand-side flow
- Station load: 0.51 GW

EnergyMix before the fix showed:

- Demand: 23.1 GW
- Generation: 32.0 GW
- Net imports: 5.0 GW
- Pumped storage charging: ~1.0 GW

That demand value was not comparable with the other dashboards. The corrected displayed demand is about 36.0 GW, using:

```text
32.0 GW domestic generation + 5.0 GW net imports - 1.0 GW pumped-storage charging ≈ 36.0 GW
```

## Data source notes

- Elexon FUELINST is the freshest source for transmission-connected generation and interconnector fuel rows at 5-minute cadence.
- NESO embedded wind and PV Live embedded solar are needed to avoid undercounting local/distribution-connected generation.
- BMRS ITSDO/INDO are still useful, but should not be the headline public demand number when the dashboard is explaining the live electricity mix including embedded sources.
- Pumped storage must be kept sign-sensitive. In the iamkate model it is a transfer/storage component, not ordinary renewable generation.
- Energy Dashboard exposes multiple demand definitions, which explains part of the apparent discrepancy: total demand, net demand, actual demand net/gross and component flows are not interchangeable.

## Implemented correction

EnergyMix now derives the displayed demand when the raw API demand diverges materially from the live supply-balance definition. This corrected value is used in:

- mobile/desktop header balance
- top metrics strip
- Power Flow demand node
- live SEO demand modules

The raw edge-function demand remains available internally; the public display now aligns more closely with iamkate and Energy Dashboard’s live power-balance model.

## Remaining follow-up

- Deploy the Supabase edge-function update once Supabase access token/login is available, so the backend returns derived display demand and new signal fields directly.
- Consider exposing both definitions in methodology: “displayed GB demand” vs “BMRS transmission demand outturn”.
- Add a small reconciliation/debug panel for internal QA comparing `rawDemandMW`, `derivedDemandMW`, `generationMW`, `netTransfersMW`, and `storageMW`.
