# Energy Mix SEO search sense check — 2026-05-22

## Fresh Search Console inspection

Raw capture: `/home/aerins/.openclaw/workspace/out/energy-canonical-url-inspection-2026-05-22.json`

Indexed:

- `https://energymix.info/` — submitted and indexed, last crawled 2026-05-20.
- `https://energymix.info/data/` — submitted and indexed, last crawled 2026-05-20.
- `https://energymix.info/uk-electricity-mix` — submitted and indexed, last crawled 2026-05-13.

Unknown to Google at inspection time:

- `https://energymix.info/carbon-intensity/`
- `https://energymix.info/today/`
- `https://energymix.info/reports/`
- `https://energymix.info/uk-electricity-generation-live/`
- `https://energymix.info/yesterday/`

Live HTTP checks showed the slash URLs return 200. The issue is discovery/indexing lag, not live-page failure.

## Changes made

- Refreshed generated weekly and daily data for 2026-05-22.
- Updated the sitemap generator so priority canonical URLs get refreshed `lastmod` values:
  - `/carbon-intensity/`
  - `/today/`
  - `/reports/`
  - `/uk-electricity-generation-live/`
  - `/yesterday/`
  - latest weekly report URL
- Tightened query-facing titles/descriptions for:
  - `/uk-electricity-mix`
  - `/carbon-intensity/`
  - `/today/`
  - `/reports/`
  - `/uk-electricity-generation-live/`
- Added stronger source-backed daily context to `/today/`.
- Strengthened static prerender content so crawlers see the current snapshot, latest settled daily summary, and latest weekly report without JavaScript.

## Deployment follow-up

After deployment, submit or reinspect the canonical slash URLs above in Search Console. The API can inspect URL state, but normal URL inspection indexing requests still need the Search Console UI.
