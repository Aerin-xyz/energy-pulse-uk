# External Data Validation

Energy Mix validates generated daily/weekly figures before publishing them.

## Wiring

1. `scripts/generate-weekly-report.mjs` fetches the primary historical feed from the Supabase `historical-generation` edge function.
2. It filters to complete days only, requiring at least 46 settlement periods.
3. It calls `validateHistoricalRows()` from `scripts/external-data-validation.mjs`.
4. The validator fetches independent comparison data:
   - Elexon Insights `FUELHH`: half-hourly generation by fuel type.
   - NESO Historic GB Generation Mix: half-hourly generation mix and carbon intensity.
   - NESO Demand Data Update: actual demand plus embedded wind/solar estimates.
5. It writes the audit file to `public/data/validation/latest.json`.
6. If a check fails, generation stops and the build fails before the public report is produced.

## Manual Commands

```bash
npm run validate:data
npm run generate:weekly
npm run build
```

`npm run validate:data` validates the latest complete generated day from the 7-day primary feed and writes the same validation JSON.

## Checks

Current checks include:

- complete generated settlement-day period count
- plausible generated average measured generation
- gas average against Elexon `CCGT + OCGT`
- wind average against Elexon `WIND`
- measured generation against Elexon non-solar generation plus generated solar
- nuclear average against Elexon `NUCLEAR`
- gas and wind against NESO Historic GB Generation Mix
- solar against NESO Historic GB Generation Mix
- solar against NESO Demand Data Update embedded solar
- NESO actual demand data completeness

## Tolerances

The validator uses deliberately tight bands for direct Elexon fuel-type matches and wider bands where source definitions differ:

- gas/wind/nuclear: 300 MW or 8%
- measured generation vs Elexon plus solar: 750 MW or 4%
- solar: 500 MW or 15%
- settlement periods: expected 48, allow 46+

These are sanity gates, not accounting-grade settlement reconciliation. The aim is to catch unit mistakes, incomplete days, stale/current-day leakage, and major source-definition drift before publishing.
