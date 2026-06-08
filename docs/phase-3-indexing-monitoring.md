# Phase 3 indexing and monitoring

_Last updated: 2026-06-08_

## Scope

Phase 3 public insight URLs to keep in the index-watch set:

- `https://energymix.info/carbon-intensity/`
- `https://energymix.info/renewables/`
- `https://energymix.info/cleanest-time-to-use-electricity/`
- `https://energymix.info/gas-generation/`
- `https://energymix.info/nuclear-power/`
- `https://energymix.info/interconnectors/`
- `https://energymix.info/electricity-demand/`
- `https://energymix.info/uk-electricity-generation-live/`
- `https://energymix.info/uk-wind-power-today/`
- `https://energymix.info/uk-solar-power-today/`
- `https://energymix.info/gas-share-of-electricity/`
- `https://energymix.info/renewables-share-today/`
- `https://energymix.info/carbon-intensity-today/`

Do not monitor `.html` aliases as canonical URLs unless the live canonical changes.

## Search Console cadence

- After each deployment that changes public SEO pages, submit `https://energymix.info/sitemap.xml` in Google Search Console.
- Inspect the Phase 3 URL set within 24 hours of deployment, then again after 3-5 days.
- For any URL reported as "Discovered - currently not indexed", "Crawled - currently not indexed", or a redirect/error state, confirm the live URL returns 200 and request indexing once the issue is fixed.
- Keep a short dated note for each inspection pass, including coverage state, last crawl date, and whether indexing was requested.

## Sitemap checks

- Confirm the live sitemap returns HTTP 200 and XML content type where possible.
- Confirm every Phase 3 URL appears once, with the canonical production host and preferred trailing-slash form.
- Confirm `lastmod` dates are current when page copy, metadata, or internal links materially change.
- Check `robots.txt` still references the sitemap and does not block public Phase 3 URLs.

## Newsletter conversion tracking

- After each release touching `/newsletter`, `/insights`, GTM, GA4, or MailerLite embed code, run one test signup path in production or a safe test environment.
- In GA4 DebugView or Realtime, confirm the newsletter conversion event fires once and includes the expected page path.
- In MailerLite, confirm the test subscriber or form submission appears, then remove test contacts where needed.
- Watch weekly conversion rate by landing page for `/newsletter`, `/insights`, `/reports`, and the Phase 3 insight URLs.

## Report indexing checks

- Weekly reports should appear in the sitemap only when the live routed report URL can return useful public content.
- Inspect the latest report URL in Search Console after publication and spot-check one older report each week.
- Track whether report pages are indexed, discovered, or excluded, and compare against internal links from `/reports`, `/newsletter`, and relevant insight pages.
- If reports are excluded repeatedly, check duplicate titles/descriptions, thin-content risk, canonical URL consistency, and whether the report archive exposes enough crawlable links.

## Weekly query and page monitoring

Every Monday, review the last 7 and 28 days in Search Console:

- Queries: clicks, impressions, CTR, and average position for UK electricity mix, carbon intensity, renewables, wind generation, gas generation, interconnectors, demand, and cleanest electricity terms.
- Pages: clicks, impressions, CTR, position, and index state for the Phase 3 URL set.
- Compare movement against recent deployments, report publication dates, and newsletter sends.
- Flag pages with rising impressions but low CTR for title/meta tuning.
- Flag pages with falling impressions or no crawl activity for internal-link and sitemap review.
