# Energy Mix GA4 / SPA route measurement check — 2026-05-15

Follow-up to task #53: verify GA4 landing-page and SPA route measurement.

## GA4 evidence

Raw capture: `/home/aerins/.openclaw/workspace/out/energy-ga4-route-measurement-2026-05-15.json`

Window checked: `2026-05-13` to `2026-05-14`.

GA4 is receiving page-view and landing-page data:

- `page_view`: `23` events
- `/`: `21` page views, `17` active users, `21` sessions
- `/data`: `2` page views, `1` active user, `1` session
- Landing pages include `/` and `/data`

Interpretation: the GTM/GA4 base tag is firing and landing-page attribution exists, but historical route-level data is thin and only shows direct page loads. That means SPA route changes cannot be trusted unless we emit an explicit route-change event.

## Change made

Added `RouteAnalytics`, mounted inside `BrowserRouter`, to push a `virtual_page_view` event to `window.dataLayer` on client-side route changes.

Payload:

- `event`: `virtual_page_view`
- `page_path`
- `page_location`
- `page_title`

The first page load is intentionally skipped to avoid double-counting the normal GTM/GA4 initial page view. Subsequent React Router navigation emits `virtual_page_view` for GTM to map into GA4 page-view tracking.

Updated `/measurement` so the measurement plan explicitly checks SPA route views.

## Verification

- `npm run build` passed.
- Local Playwright check against Vite preview confirmed:
  - initial GTM events load (`gtm.js`, `gtm.dom`)
  - navigating `/` → `/uk-electricity-mix` emits `virtual_page_view` with `page_path: /uk-electricity-mix`
  - navigating `/uk-electricity-mix` → `/carbon-intensity` emits `virtual_page_view` with `page_path: /carbon-intensity`
  - page titles are captured after Helmet updates.

## Deployment follow-up

After deploy, confirm in GTM/GA4 that `virtual_page_view` is mapped to a GA4 page-view event or a dedicated custom event. If GTM is not already configured for that event, add a GTM trigger/tag rather than adding direct GA credentials to the codebase.
