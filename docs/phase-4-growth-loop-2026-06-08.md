# Phase 4 growth loop baseline - 2026-06-08

Phase 4 goal: confirm Phase 3 is live, make Google aware of the new sitemap state where possible, capture the measurement baseline, and prepare the first external sharing loop without posting publicly.

## Deployment and live URL check

Checked on 2026-06-08 after commit `c8c0616` reached `origin/main`.

Live routes returning HTTP 200:

- `https://energymix.info/`
- `https://energymix.info/sitemap.xml`
- `https://energymix.info/uk-wind-power-today/`
- `https://energymix.info/uk-solar-power-today/`
- `https://energymix.info/gas-share-of-electricity/`
- `https://energymix.info/renewables-share-today/`
- `https://energymix.info/carbon-intensity-today/`
- `https://energymix.info/reports/weekly/2026-06-08/`

Live sitemap includes the five Phase 3 insight URLs and the 2026-06-08 weekly report URL. `robots.txt` allows public pages and points to `https://energymix.info/sitemap.xml`.

## Search Console sitemap state

Property checked: `sc-domain:energymix.info`.

Current sitemap record:

- Sitemap path: `https://energymix.info/sitemap.xml`
- Last submitted: `2026-05-16T18:58:46.562Z`
- Pending: `true`
- Last downloaded: not reported by the API
- Warnings: `0`
- Errors: `0`

Attempted API resubmission on 2026-06-08. It failed with `ACCESS_TOKEN_SCOPE_INSUFFICIENT` for `google.searchconsole.v1.SitemapsService.Submit`. The current token can read Search Console data but cannot submit sitemaps.

Manual action needed: resubmit `https://energymix.info/sitemap.xml` in the Search Console UI for `sc-domain:energymix.info`.

## URL inspection baseline

Checked with the Search Console URL Inspection API on 2026-06-08.

Indexed:

- `https://energymix.info/` - submitted and indexed; last crawl `2026-06-05T10:51:11Z`
- `https://energymix.info/newsletter/` - submitted and indexed; last crawl `2026-06-04T01:21:02Z`
- `https://energymix.info/reports/` - submitted and indexed; last crawl `2026-05-22T16:37:08Z`

Unknown to Google immediately after deploy:

- `https://energymix.info/uk-wind-power-today/`
- `https://energymix.info/uk-solar-power-today/`
- `https://energymix.info/gas-share-of-electricity/`
- `https://energymix.info/renewables-share-today/`
- `https://energymix.info/carbon-intensity-today/`
- `https://energymix.info/reports/weekly/2026-06-08/`

This is expected for brand-new URLs minutes after deployment. Reinspect after sitemap resubmission and again after 3-5 days.

## GA4 baseline

Property: `properties/537091012`.

Last 7 days at capture:

- Top page paths:
  - `/` - 26 active users, 30 sessions, 29 page views
  - `/data/` - 3 active users, 8 sessions, 8 page views
  - `/power-flow` - 1 active user, 1 session, 1 page view
- Top events:
  - `page_view` - 38
  - `session_start` - 38
  - `first_visit` - 29
  - `scroll` - 20
  - `user_engagement` - 9
  - `click` - 5
- Top landing pages:
  - `/` - 26 active users, 28 sessions
  - `/data` - 3 active users, 6 sessions
  - `(not set)` - 1 active user, 4 sessions

No Phase 3 newsletter CTA or signup events are visible yet. That is expected before real usage, but GTM mapping still needs checking.

## GTM status

Live site includes GTM container `GTM-K3QJHHTW` and GA4 measurement ID `G-6C946559GE` appears in the public GTM script.

Current token cannot inspect GTM via API because it lacks Tag Manager scopes. Public GTM script inspection did not show the new custom event names:

- `newsletter_cta_click`
- `newsletter_signup_submit`
- `newsletter_signup_success`
- `api_widget_waitlist_click`
- `virtual_page_view`

Action needed: refresh OAuth with GTM scopes or check the GTM UI. Confirm whether GTM maps these `dataLayer` events to GA4 events. If not, add GTM triggers/tags for them rather than adding direct GA credentials in code.

## Search performance baseline

Search Console last 7 days, 2026-06-01 to 2026-06-08:

- `/` - 73 impressions, 0 clicks, average position 42.85
- `/carbon-intensity/` - 68 impressions, 0 clicks, average position 8.62
- `/data/` - 35 impressions, 0 clicks, average position 17.46
- `/today/` - 23 impressions, 0 clicks, average position 5.22
- `/reports/` - 19 impressions, 0 clicks, average position 42.05
- `/newsletter/` - 11 impressions, 0 clicks, average position 4.36
- `/reports/weekly/2026-05-22/` - 7 impressions, 0 clicks, average position 4.86
- `/yesterday/` - 9 impressions, 0 clicks, average position 6.11

Search Console last 28 days, 2026-05-11 to 2026-06-08:

- `/` - 378 impressions, 3 clicks, average position 40.81
- `/carbon-intensity/` - 176 impressions, 0 clicks, average position 10.65
- `/data` - 166 impressions, 0 clicks, average position 7.85
- `/uk-electricity-mix` - 119 impressions, 0 clicks, average position 14.61
- `/newsletter` - 94 impressions, 0 clicks, average position 4.53
- `/today/` - 57 impressions, 0 clicks, average position 25.19

Early query signals:

- `energy dashboard` - 82 impressions over 28 days, 1 click, average position 79.73
- `energy dashboard live` - 34 impressions over 28 days, average position 50.15
- `"/intensity/now" carbon intensity api` - 23 impressions over 28 days, average position 4.96
- `carbon intensity uk` - 2 impressions over 28 days, average position 40.5
- `national grid values` - 1 impression over 7 days, average position 1

## First external share drafts

Do not publish these without Joe's explicit approval.

### LinkedIn draft

EnergyMix.info now has a weekly UK electricity mix report.

This week's snapshot:

- Renewables averaged 56.5% of measured generation
- The strongest renewable day was Thursday 4 June at 70.2%
- Wind was the biggest swing factor
- Gas was lowest when renewable share was strongest

The aim is simple: turn public GB electricity data into a readable weekly brief covering renewables, gas, carbon intensity and cleaner electricity windows.

Latest report:
https://energymix.info/reports/weekly/2026-06-08/

Live dashboard:
https://energymix.info/

### Short X / Bluesky draft

New weekly UK electricity mix report:

Renewables averaged 56.5% of measured generation, with the strongest renewable day reaching 70.2%.

Plain-English GB grid context: renewables, gas, wind, solar and cleaner electricity windows.

https://energymix.info/reports/weekly/2026-06-08/

### Newsletter CTA copy

Get the weekly UK electricity mix brief: renewables, gas, carbon intensity, records and cleaner electricity windows, pulled from public grid data.

https://energymix.info/newsletter/

## Next checks

- Manually resubmit the sitemap in Search Console.
- Use Search Console URL Inspection UI to request indexing for the five Phase 3 pages and latest weekly report.
- Refresh Google OAuth with GTM scopes, then confirm custom `dataLayer` events map into GA4.
- Re-run GSC URL inspection in 3-5 days.
- Re-run GA4/GSC baseline next Monday and compare impressions, clicks, indexed state and newsletter event counts.
