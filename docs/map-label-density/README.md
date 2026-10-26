# Zoomed atlas label cleanup — 26 October 2026

## Confirmed issue
The production substation layer exposed all names at zoom >4, shrinking font size only by sqrt(zoom). Screen text therefore enlarged with zoom. It had no collision handling with itself or generation labels. The 100 MW generator capacity filter does not apply to infrastructure.

## Changes
- Network names off by default; explicit names toggle in collapsed Map layers & key.
- Network-name preference restores through URLs and Back navigation independently of capacity.
- Network dots/text/outline scale inversely with zoom; overview country/sea labels disappear at detailed zoom.
- Shared screen-space collision suppression for asset captions and network names, including viewport and control exclusion. Selected assets have first priority; generation takes priority over background infrastructure. Existing search filtering and marker evidence retained.
- Mobile pan controls collapsed behind an accessible toggle; zoom/reset remain immediately available. Network lines and all source data unchanged.

## Checks
Build and TypeScript. Browser tests cover mobile/desktop at 8x, 16x and maximum 32x zoom; all sites and above-100 MW; optional names on/off; no visible label collisions; bounded font sizes; pan controls; asset permalink reload; automatic map/fullscreen checks at eight widths. Physical-device testing unavailable. Screenshots included.
