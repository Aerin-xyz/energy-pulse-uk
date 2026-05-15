# Energy Mix first post-indexing measurement review — 2026-05-15

## Scope

First 48–72h measurement check after the 2026-05-13 sitemap/indexing refresh.

Raw captures:

- `/home/aerins/.openclaw/workspace/out/energy-analytics-2026-05-15.json`
- `/home/aerins/.openclaw/workspace/out/energy-indexing-check-2026-05-15.json`

## Google Search Console

### Sitemap

- Sitemap: `https://energymix.info/sitemap.xml`
- Last submitted: `2026-05-13T14:47:42.080Z`
- Pending: `true`
- Warnings: `0`
- Errors: `0`

### URL inspection

| URL | Verdict | Coverage | Fetch | Canonical / note |
| --- | --- | --- | --- | --- |
| `/` | PASS | Submitted and indexed | SUCCESSFUL | `https://energymix.info/` |
| `/uk-electricity-mix` | PASS | Submitted and indexed | SUCCESSFUL | `https://energymix.info/uk-electricity-mix` |
| `/carbon-intensity` | NEUTRAL | Redirect error | REDIRECT_ERROR | Live curl returns 200; likely historical GSC state to re-check/request validation. |
| `/renewables` | NEUTRAL | Redirect error | REDIRECT_ERROR | Live curl returns 200; likely historical GSC state to re-check/request validation. |
| `/uk-electricity-generation-live` | NEUTRAL | URL is unknown to Google | Unspecified | Needs stronger crawl/index signal. |
| `/today` | NEUTRAL | Redirect error | REDIRECT_ERROR | Live curl returns 200; likely historical GSC state to re-check/request validation. |
| `/reports` | NEUTRAL | Redirect error | REDIRECT_ERROR | Live curl returns 200; likely historical GSC state to re-check/request validation. |
| `/llms.txt` | NEUTRAL | URL is unknown to Google | Unspecified | Expected/acceptable for text asset, but monitor. |
| `/llms-full.txt` | NEUTRAL | URL is unknown to Google | Unspecified | Expected/acceptable for text asset, but monitor. |
| `/ai/uk-electricity-mix.html` | NEUTRAL | URL is unknown to Google | Unspecified | Live URL redirects to `/ai/uk-electricity-mix`; sitemap/monitoring should use canonical URL. |

### Search performance

GSC has no rows yet for `2026-05-13` or `2026-05-14`, so post-refresh search performance is still too delayed for a clean read.

Last available 7-day data (`2026-05-08` to `2026-05-14`):

- Clicks: `1`
- Impressions: `86`
- CTR: `1.16%`
- Average position: `12.85`

Top page rows:

- `/` — `1` click, `63` impressions, average position `16.0`
- `/data` — `0` clicks, `62` impressions, average position `3.5`
- `/newsletter` — `0` clicks, `48` impressions, average position `2.9`

Top query rows:

- `energy dashboard live` — `6` impressions, average position `76.5`
- `energy dashboard` — `3` impressions, average position `77.7`
- `uk energy dashboard` — `2` impressions, average position `60.0`
- `electricity live`, `elexon insights`, `uk energy mix today` — `1` impression each

## GA4 / GTM

- Property: `properties/537091012`
- Realtime at capture: no active users.
- Today at capture: no rows yet.
- Yesterday (`2026-05-14`):
  - Active users: `7`
  - Sessions: `11`
  - Screen/page views: `13`
  - Engaged sessions: `1`
  - Event count: `43`
  - Key events: `0`

Interpretation: page views are firing, but engagement is thin and the current automated capture does not yet break yesterday down by landing page. A follow-up should verify SPA routing/landing-page attribution and engagement events before major content expansion.

## Findings

1. Core homepage and `/uk-electricity-mix` are indexed — good.
2. Several priority pages show GSC `Redirect error` despite live HTTP 200 checks. This needs Search Console validation/reinspection rather than assuming production is broken.
3. `/uk-electricity-generation-live` and AI/LLM assets are still unknown to Google.
4. `/ai/uk-electricity-mix.html` is the wrong monitored URL if the live canonical path is `/ai/uk-electricity-mix`.
5. GSC post-refresh performance data is not available yet, so query/content decisions should wait for another 24–48h.
6. GA4 is receiving traffic, but engagement/SPA measurement quality needs a focused check.

## Recommended follow-ups

- Reinspect/validate the priority URL set in GSC, switching AI page monitoring from `.html` to `/ai/uk-electricity-mix`.
- Strengthen crawl signals for unknown priority pages, especially `/uk-electricity-generation-live`.
- Add/verify GA4 landing-page and SPA route tracking before judging page engagement.
- Repeat the performance read once GSC has data through at least `2026-05-15`.
