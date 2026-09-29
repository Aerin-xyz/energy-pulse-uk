# All-days report validation — review, not deployed

## Contract
The report generator now invokes an all-days gate before modifying generated report data or the archive. Each included day is reconciled, not just the latest. Gaps inside the date range, duplicate days, mixed bases and incomplete days block the run. A shorter-than-seven-day contiguous window is explicitly a warning, not claimed to be a full week.

Elexon FUELHH is checked per half-hour and required fuel; newest publication revision wins, conflicting equal-revision records fail, missing values stay missing and negative storage remains signed. NESO Historic GB Generation Mix metadata explicitly states DATETIME is UTC; this metadata is frozen with the evidence. UTC and UK settlement days are aligned to exact instants, including 46/50-period DST days. Gas, wind, nuclear, biomass and natural hydro are reconciled at every interval. Solar uses NESO estimates. The daily Energy Mix aggregates are compared to independent integrals of those official intervals. The legacy report feed does not expose its raw underlying intervals, so this is not a claim that every internal stored observation has been inspected.

Pumped storage is not natural hydro or renewable generation. Imports and embedded wind are excluded from this report basis; biomass is excluded from the renewable numerator. Non-renewable oil is grouped with Other. Thresholds are recorded in each result, not hidden: 0.1%/1 MW for comparable provider intervals; 0.1%/1 MWh for fuel energy, 2%/12 MWh for solar estimates; 0.2%/12 MWh for total reconciliation.

Carbon actuals are fetched for all days and checked for complete, nonduplicated half-hours. Forecasts never fill missing actuals. Carbon means are time averages, not consumption-weighted intensity. Existing proxy claims are not automatically upgraded to measured carbon rankings. Missing carbon leaves carbon claims unavailable and prevents an unqualified whole-report pass, but does not invent generation failures.

## Evidence and publication
Each run saves compressed original JSON, source URLs, retrieval times, SHA-256 hashes, validator version/hash, per-interval differences, daily CSV and manifest in a content-addressed run directory. Report metadata pins a specific manifest and CSV; it does not point to mutable latest.json. Failed runs remain diagnostic artifacts and cannot create/update a report. GitHub saves evidence on success or failure (90-day workflow artifact retention); successful report-linked evidence is committed with the report.

Site releases compile the committed last-published data. Scheduled data refresh explicitly runs the gate before committing any new data. A wording release is therefore not held hostage by source availability and cannot silently publish failed refreshed figures.

## Verified historical result
23–28 September, six UTC days: the new gate correctly FAILED. All six days' Hydro excess exactly equals positive pumped-storage output: 5,813; 1,449; 4,372; 4,815; 2,581; 7,462 MWh respectively. Additional provider disagreements: nuclear on 23 September and wind on 28 September. These are not automatically attributed to a provider error; may involve revisions/definitions and need resolution before publication.

All 288 carbon actual intervals were present in the captured run. Frozen generation/solar calculations yield a candidate 39.8322% energy-weighted renewable share under the stated natural-hydro definition; this is NOT a corrected published report or a passed result, because provider mismatches remain.

The real generator invocation failed before changing reportArchive.json or energyMixGenerated.json; SHA-256 checks confirmed both unchanged. Offline replay reproduced the six-day calculations and verified raw hashes. Eleven focused tests cover valid data, missing vs zero, duplicate/revised records, DST, storage misclassification, cancelling interval errors, weighting, carbon gaps and end-to-end failure/evidence retention. App TypeScript and site build passed.

## Use
`npm run validate:report -- input.json output-directory 2026-09-29`

Input is the exact daily report rows (MWh in legacy `mw` fields), not reconstructed headline values. For normal publication `npm run refresh:data` invokes the gate automatically.

`npm run replay:report -- path/to/manifest.json`

The current captured evidence pack accompanies this PR under public/data/validation/reports; its status is FAILED. It is a retrospective diagnostic, not validation attached to the frozen original report. No archived figures were rewritten. Do not merge this pipeline expecting the current historical feed to pass: hydro/storage and provider discrepancies must be resolved first. No historical-data backend deployment is included.
