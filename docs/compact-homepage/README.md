# Compact homepage context — 29 September 2026

Consolidates the existing homepage without changing its data sources, refresh cadence or calculation definitions.

- Removes the generic standalone “Why it matters” block and duplicate historical-chart introduction.
- Keeps price, signed pumped storage and net transfers in three compact linked rows.
- Places readings beside the outlook on desktop, stacked within normal gutters on mobile.
- Shows the forecast window date alongside its time, including cross-date windows; preserves 1/2/3-hour selection, forecast caveats and dated source evidence.
- Adds native touch/keyboard half-hour inspection and dated chart endpoint labels. Decorative bars remain supplemented by exact values and evidence table.
- Removes obsolete editorial/signals CSS, including the negative mobile margin and reversed chapter order.

Before/after screenshots at 390px and 1366px are captured from production and the local built candidate respectively. Dynamic source values can differ between captures; these are layout comparisons, not data-parity evidence.

Physical iOS/Android not tested. Browser viewport emulation is not physical-device validation. No field-performance claims.

Validation: app TypeScript and production-mode build passed; seven metric tests passed. Focused browser coverage includes six viewport widths, date rollover, duration and half-hour selection, missing forecast, existing map/evidence navigation, carbon labels and logo/motion. An obsolete globe-logo test selector was corrected to the restored logo; its targeted rerun passed. Final browser log included with this change.
