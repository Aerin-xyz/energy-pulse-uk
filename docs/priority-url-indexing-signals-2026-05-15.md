# Energy Mix priority URL indexing signals — 2026-05-15

Follow-up to the first post-indexing measurement review.

## Evidence checked

- Google Search Console URL inspection capture: `/home/aerins/.openclaw/workspace/out/energy-indexing-check-2026-05-15.json`
- Live HTTP checks showed the priority app routes return HTTP 200 on production, while `/ai/uk-electricity-mix.html` redirects to canonical `/ai/uk-electricity-mix`.
- GSC still reported historical `Redirect error` states for `/carbon-intensity`, `/renewables`, `/today`, and `/reports` despite live HTTP 200 responses.
- GSC reported `/uk-electricity-generation-live`, `/llms.txt`, `/llms-full.txt`, and `/ai/uk-electricity-mix.html` as unknown to Google.

## Changes made

- Added explicit Cloudflare Pages rewrite rules for priority routes before the SPA catch-all:
  - `/carbon-intensity`
  - `/renewables`
  - `/uk-electricity-generation-live`
  - `/today`
  - `/reports`
  - `/ai/uk-electricity-mix`
- Added `/uk-electricity-generation-live` to the React navigation topic links as `Generation live`.
- Added `/uk-electricity-generation-live` to the prerendered static HTML navigation used by the no-JavaScript/search fallback.
- Refreshed sitemap `lastmod` dates for affected priority URLs and AI/LLM assets to `2026-05-15`.
- Kept the sitemap AI URL canonical as `/ai/uk-electricity-mix`; the `.html` form should not be monitored as the canonical URL.

## Verification

- `npm run build` passed.
- Build copied the explicit `_redirects` rules into `dist/_redirects`.
- Prerendered HTML includes the new crawlable `/uk-electricity-generation-live` link.

## Manual Search Console follow-up

When deployed, use Search Console URL inspection to re-check:

- `https://energymix.info/carbon-intensity`
- `https://energymix.info/renewables`
- `https://energymix.info/uk-electricity-generation-live`
- `https://energymix.info/today`
- `https://energymix.info/reports`
- `https://energymix.info/ai/uk-electricity-mix`

Do not use `/ai/uk-electricity-mix.html` as the canonical monitoring URL.
