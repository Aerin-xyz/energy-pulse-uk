# Header and generation mix refinement — 28 September 2026

Review-only update based on the supplied mobile screenshots.

- Restores the original AnimatedLogo particle ring, cycling ocean/coral/violet/green with a gentle decorative pulse. Pause and dynamic reduced-motion preferences are respected. Brand animation is not a source-status indicator.
- Refines the heading typography and gradient, reduces introductory copy, and keeps header touch targets at least 44px.
- Gives the section immediately beneath the map a clear Generation mix heading. Fuel colours, GW and percentages are visible by default, not hidden in a disclosure. Only coverage/definitions remain collapsible.
- Keeps the existing observation-basis controls, missing-data behaviour and independent demand/carbon timestamps. No data pipeline changes.

## Actual local browser captures

[Phone header](header-390.png) · [Phone mix](mix-390.png) · [Desktop header](header-1366.png) · [Desktop mix](mix-1366.png)

Captures use the local review server with cached public readings; their ages are not production freshness measurements. Actual data values may change.

## Verification

App TypeScript check and production-mode local build pass. Focused browser tests verify 360/390/430/1366px, logo colour transition, pause/reduced motion, visible fuel values and retained independent timestamp/missing-data behaviour. Existing site-family navigation checks are retained. See the captured test log for the final count.

No physical-device testing or new field-performance claims. Not deployed: the user's earlier no-unreviewed-deployment instruction is retained. Commit prefix suppresses Cloudflare preview deployment.
