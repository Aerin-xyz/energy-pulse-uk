# Final lab comparison

Same local uncompressed static server; cold browser contexts; warm read-only API proxy cache; 4× CPU slowdown,150ms latency,1.6Mbps download; 3 runs per width/phase. Lab only, not field CWV/INP.

Baseline3928684 and finalreview; three cold-context runs per viewport/phase. Same host and local uncompressed server. These are lab samples, not p75field results.

| Viewport | LCP before → after (median; range), ms | CLS before → after (median) | Decoded resource bytes before → after (median) |
|---|---|---|---|
| 390px | 2028 (2016–2032) → 2376 (2368–2384) | 0.074 → 0.008 | 7,999,653 → 1,504,899 |
| 1440px | 2056 (2052–2060) → 2420 (2420–2428) | 0.002 → 0.002 | 7,999,653 → 1,504,899 |

Observed same-origin initial API data: **874,481 decoded bytes**, below the proposed1MiB data budget. Initial entry JS build output: about **136KB gzip**, below220KiB. No operational-assets or network-geography requests before opening the atlas. The roughly81% resource reduction is not an81% faster LCP claim: LCP is about0.35s slower after the change (2.38–2.42s versus2.03–2.06s). Preloading the font trades a small paint delay for stable text/layout in this throttled lab. Both remain below the proposed2.5s lab reference, not a field pass.

Production compression, GTM/consent and cross-origin response visibility differ. Carbon endpoints have zero visible resource body sizes in this browser trace; this is not proof of zero cost. The600KiB total-production-transfer budget and field INP remain unverified. Local uncompressed transfer bytes are included in the raw JSON, not presented as production bandwidth.

Pre-fix mobile CLS0.262 was unacceptable; actual homepage SSR, source/fuel space reservation and font preload resolve it in final repeated runs. Long-task samples are in the raw file; they are not interaction latency/INP. No competitor speed ranking is claimed.
