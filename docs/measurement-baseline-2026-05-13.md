# Energy Mix measurement baseline — 2026-05-13

## Status at baseline

- Production site: `https://energymix.info/`
- Production deployment branch: `main`
- Current production trigger commit: `b5adcc0` (`Trigger production deployment from main`)
- GTM container present: `GTM-K3QJHHTW`
- Sitemap: `https://energymix.info/sitemap.xml`
- Sitemap `lastmod` refreshed to `2026-05-13`
- Robots file points to sitemap and allows priority public pages.
- IndexNow/Bing submission accepted on 2026-05-13 (`HTTP 202`) for priority URLs.
- Google Search Console sitemap/priority indexing request completed manually by Joe on 2026-05-13.

## Priority URLs to monitor

- `https://energymix.info/`
- `https://energymix.info/uk-electricity-mix`
- `https://energymix.info/carbon-intensity`
- `https://energymix.info/renewables`
- `https://energymix.info/uk-electricity-generation-live`
- `https://energymix.info/today`
- `https://energymix.info/reports`
- `https://energymix.info/llms.txt`
- `https://energymix.info/llms-full.txt`
- `https://energymix.info/ai/uk-electricity-mix.html`

## 48–72h check to run

Target window: 2026-05-15 to 2026-05-16.

Record from Google Search Console:

- Sitemap status and discovered URL count.
- Page indexing: indexed / discovered / crawled not indexed / blocked / duplicate.
- URL inspection status for each priority URL.
- Search performance since deploy: total clicks, impressions, CTR, average position.
- Top queries and top landing pages.
- Any crawl, canonical, robots, redirect, or soft-404 warnings.

Record from GA4/GTM:

- Realtime/DebugView confirms page views firing on the live domain.
- Last 48h users/sessions/page views.
- Top landing pages.
- Engagement on dashboard vs explainer/report pages.
- Any obvious tracking gaps caused by SPA routing.

## Decision rules after first check

- If priority pages are discovered but not indexed: improve static copy/internal links and request inspection again.
- If pages are indexed but impressions are weak: build 3–5 stronger answer-led pages around observed queries.
- If homepage gets traffic but engagement is weak: add a plain-English live summary and clearer next-click prompts.
- If tracking is incomplete: fix measurement before adding more content.
