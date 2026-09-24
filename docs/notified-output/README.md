# Current notified output, 24 September 2026

## Scope and semantics
All 92 entries strictly above 100 MW installed capacity in the operational GB catalogue have an explicit notification-mapping decision. This is catalogue coverage, not a claim to enumerate every generator in GB. No capacity threshold is applied to constituent units. Mapping decisions are independent of the eight verified delayed-metered-history mappings.

81 generating-unit groups are linked; 11 remain review-required. The initial current-period query yielded 80 complete totals; VPI Immingham B lacked its unit notification. These counts are observations, not guaranteed ongoing availability. Missing is not zero. The mapping file records source IDs, exact Elexon identifiers, registry names, lead parties, fuel identities and reasons for withholding ambiguous groups. Runtime registry checks reject changed identities; retired Drax coal, auxiliaries, separate demand and battery units are excluded. Totals are for explicitly matched generating groups, not necessarily every auxiliary at a geographical complex. No capacity-factor or curtailment inference is made.

## Verified source
- Elexon PN: https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=2026-09-24&settlementPeriod=37&format=json
- Unit register: https://data.elexon.co.uk/bmrs/api/v1/reference/bmunits/all?format=json
- Definition: https://www.elexon.co.uk/bsc/glossary/final-physical-notification/
- Open reuse licence: https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/

PN is expected export/import absent balancing acceptances. Values are scheduled MW. Integrating linear segments over the half-hour yields average MW; it does not produce measured output. Complete nonconflicting contiguous segments are required for every mapped unit. Row publication time is unavailable and stays null. Retrieval time and content hash are retained separately.

## Refresh
A same-origin Cloudflare Pages endpoint fetches the current GB settlement period directly from Elexon and shares a maximum 60-second server cache, bounded by period end. Browser refresh is 30 seconds. Registry identity cache is one hour. No API key/subscription. Existing scheduled ingestion maintains a dated static fallback. Failure never relabels a past half-hour as current; current endpoint failure is indicated even when fallback data exists. Endpoint cache keys are server-derived date/period, not arbitrary user input. Official upstream requests are bounded at 12 seconds. Not dependent on a GitHub build for current notifications.

The scheduled job uses the same validation/calculation functions. Future new >100MW entries need an explicit mapping decision; no automatic fuzzy matching. The coverage regression test detects register drift.

## Presentation
Current notified MW appears on individual map captions and result rows. A quick >100MW scope button retains all qualifying records, including unresolved ones. The asset panel leads with 'Notified output · current half-hour', or marks past periods explicitly, with 'Last measured output' separate. No artificial live animation is added to static infrastructure.

## Verification
37 existing calculation/ingestion tests plus four new notification contract tests; 43 browser tests passed. TypeScript, production build and Cloudflare functions compilation passed. Local Cloudflare endpoint returned HTTP 200, all 92 mapping decisions and 205 current-period PN segments. Live acceptance recorded after release.
