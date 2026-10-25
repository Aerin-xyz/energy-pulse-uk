# Measurement boundaries

The audit is a point-in-time public observation, not private analytics. This implementation preserves existing analytics/consent and does not change Search Console settings.

- Runtime: Chromium via Playwright on this Linux host; viewport emulation is not physical Safari/iOS/Android/VoiceOver.
- Baseline screenshots: live production on 25 October 2026, 390×844 and 1440×1000. Seven-width local layout screenshots separately labelled.
- Comparative lab: frozen baseline commit 3928684 and review build, same local static server (uncompressed assets), read-only proxy API cache. Cold browser contexts; 4× CPU slowdown; 150 ms latency; 1.6 Mbps download. Three runs each at390/1440. Lab LCP/CLS/long-task samples are not field INP or p75.
- Sources and returned observation timestamps remain real; changes in upstream availability are not controlled experimental outcomes. Do not compare competitor performance to these local results.
- No available Search Console/CrUX/analytics access was established in this task. Indexing, rankings, traffic and field Core Web Vitals remain unverified, not passed.
- Human task success, physical devices, text scaling via OS settings and screen-reader certification require separate user/device access. Automated axe, keyboard journeys and viewport checks are narrower evidence.
- Expansion B15 stays deferred: theme, alerts, accounts, paid tariffs and public API commitments require separate justification, source coverage and operating ownership.

## Existing ownership and definitions
Energy Mix owns compilation/corrections; Elexon, NESO, Carbon Intensity API and registers remain original providers. Existing public source links and required attribution remain. No invented personal operator identity or professional credentials. Export source rights follow the original provider; no blanket mixed-source licence or new public API availability promise is made.
