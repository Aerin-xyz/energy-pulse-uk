# Site-wide design rollout — 15 September 2026

Authorized by the Energy Mix user: carry the accepted command-centre design style to the rest of the site. Existing live-release authorization remains in force.

## Changes
- Extracted the homepage navigation into one shared component. Interior routes now have the same branded top bar, current-section sidebar, mobile horizontal navigation and motion control. On phones, navigation scrolls to the active section.
- Added a shared interior frame, keyboard skip link, route-section label and grouped site footer. Removed duplicate legacy page headers/footers. Admin routes inherit the frame without changing their actions or authorization; share-image routes keep their fixed export layout.
- Matched typography, dark electric surfaces, blue/mint/violet/amber accents, cards, charts, tabs, tables, inputs and buttons. Long explanations retain readable line lengths and spacing instead of dashboard density.
- Updated Explore's page heading without removing chart controls. The homepage and cable map remain in their existing composition.
- Static reading pages use the same visual frame without JavaScript. Legacy .html files that shadowed modern routes now receive current generated HTML; React aliases preserve old direct HTML URLs. AI-readable summary retains its content and receives the static frame.
- Existing metadata, canonical URLs, archive contents, newsletter action and data calculations preserved. Build generated the next dated report through the existing append-only process.

## Verification
- Production build and TypeScript passed.
- 21 browser tests passed, including 40 public routes at both 390px and 1440px, sidebar/skip-link navigation, legacy aliases, no-JavaScript styling, homepage cable/motion regression, archive behavior and power-flow layout.
- Visual review screenshots: reports, about, data, newsletter, explore, carbon intensity and mobile reports, in workspace artifacts/energy-mix-site-system-2026-09-15.
- No subscription was submitted. The embedded reCAPTCHA showed an existing provider quota warning during visual review; this is not resolved by the design change. The form's verification/action remains intact, with dark theme enabled.
- Existing backend Supabase credential blocker and external-data validation caveats are unchanged.
