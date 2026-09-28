# Carbon freshness correction

Review branch, not deployed. Based on the read-only 28 September investigation: cache written 12:26:08 expired12:31:08, missing the12:31:02 cron; public carbon recovered at12:37. Interval-start age and forecast-as-actual fallback were separate problems.

## Changes
- Enrichment cache expires five seconds before the next :01/:06/etc scheduled tick, rather than300seconds after fetch completion. No extra cron runs or scheduled function invocations. Upstream enrichment is now fetched on each intended cycle instead of accidentally reusing alternate-cycle responses; this can increase actual upstream requests relative to the buggy cache behaviour.
- Versioned carbon contract: full interval, fetchedAt, official actual and forecast independently nullable, basis and retention status. No forecast is placed in actual. Zero is retained; invalid/future actual readings rejected.
- Failed carbon fetch retains only validated v2 last-good readings, preserving their interval and original fetchedAt. Legacy data cannot be assumed to contain genuine actuals and is not promoted into v2.
- Homepage shows reported actual, date/time interval, minutes since interval ended and separate forecast. Other carbon consumers stop silently substituting forecasts, preserve zero and avoid null-as-zero progress.
- Freshness normalization preserves explicit unavailable/retained states. Existing generation cadence and calculation definitions unchanged.

## Validation
67 Node tests pass, including six new carbon/cache boundary tests. Nine focused browser tests pass at phone/desktop widths, covering actual, missing actual, forecast, retained interval, independent generation timestamps, logo and motion regressions. App TypeScript, local production-mode build and edge-function esbuild bundle pass. Esbuild is a bundle/import check, not a deployed Deno runtime test.

[Phone preview](preview-390.png) · [Desktop preview](preview-1366.png). These show official source data normalized locally and served as a browser fixture; they are not evidence of a live backend deployment. [Source fixture provenance](preview-source.json).

## Release order after approval
1. Include new `src/lib/evidence/carbon.mjs` in the function dependency bundle. Deploy `energy-data` and `cache-warmup` (the latter imports updated freshness normalization). Cache key bump prevents reuse of the old untyped carbon result.
2. Let the existing scheduled ingestion publish v2 carbon and check actual/forecast/interval against the official current endpoint, including the next cache-expiry boundary. Do not increase cron cadence.
3. Merge/release the frontend and verify public interval labels, missing/retained state and official values after edge release.

The five-second guard is bounded slack, not a guarantee against provider delays or scheduler drift. Official current and range endpoints were observed to disagree temporarily on whether actual was available; do not silently combine them. Publication time is not supplied and is not invented. Physical-device and field performance validation are unchanged from the preceding release.
