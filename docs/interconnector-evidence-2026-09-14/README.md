# Cable-level map audit and release — 14 September 2026

## Verified feed
Public Elexon Insights `/datasets/FUELINST` returned HTTP 200 and CORS `*`, with separate INTFR, INTIFA2, INTELEC, INTNED, INTNEM, INTNSL, INTVKL, INTEW, INTIRL and INTGRNL observations. Each includes startTime, publishTime and signed generation in MW. Actual sample retained as the cable-flows test fixture (14 September 20:25 UTC and earlier).

The existing backend combines French readings and has obsolete/incomplete aliases (notably missing INTVKL). The new map reads FUELINST directly and does not need a Supabase deployment or credential. Its independent five-minute observations must not be merged with older ENTSO-E border periods. The legacy border snapshot and Connections map layer remain explicitly separate. No changes to total demand/supply accounting in this release.

Six-hour query, five-minute refresh while visible, 15-second timeout, cancellation on unmount. On request failure, observations retain their timestamps. Latest published revision per observation wins; invalid/future rows are excluded. No MWh conversion, interpolation, country-total splitting, or fabricated cable fallback. Nominal capacity ratio can exceed 100% and is not clamped or described as current available capacity. Zero does not mean operational outage.

## Geography
Geography and nameplate ratings corroborated against the public references in geography.json. Initial requests to several operator sites were blocked; Wikipedia accepted the identifying research User-Agent and provided the referenced descriptions. Operator links are supplied as further information, not presented as sources we successfully inspected in every case. BritNed and ElecLink public sites were also accessible.

Markers are approximate town/terminal-area centres, NOT exact landing sites or surveyed infrastructure coordinates. Lines join those areas schematically, NOT physical subsea routes. IFA2's Solent–Tourbe link and ElecLink's Channel Tunnel terminal areas are distinct from IFA. Moyle connects Scotland to the separate Northern Ireland/all-island market.

## Verification
TypeScript, production Vite build + prerender; 11 homepage browser cases including French separation, zero/missing, delayed motion, expanded map, mobile, pause and reduced motion. Three targeted parser tests cover signed MW, latest revisions, future data and loading ratios. Desktop/mobile visual review and real upstream browser fetch. Existing metric/archive tests retained.
