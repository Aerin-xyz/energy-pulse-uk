# Energy Mix deployment + LLM/search checklist

_Last updated: 2026-05-08_

## Current live-site findings

- `https://energymix.info/` returns HTTP 200.
- Root and `www` resolve to `185.158.133.1`.
- Cloudflare is in front of the site (`server: cloudflare`). GoDaddy may still be registrar/origin hosting, but Cloudflare is definitely on the request path.
- Live `robots.txt` and `sitemap.xml` exist, but the live sitemap inspected on 2026-05-08 had stale `lastmod` dates from 2024. The repo sitemap is newer than live, so deployment should replace the live assets.

## Deployment path

1. Confirm the target host for the new GitHub-backed deployment: Cloudflare Pages, Netlify/Vercel, GoDaddy static hosting, or another host.
2. Build from this repo with `npm run build`.
3. Deploy `dist/` plus Supabase Edge Functions/config as appropriate.
4. Ensure `energymix.info` and `www.energymix.info` both resolve to the new deployment and one canonical host redirects cleanly.
5. Verify these URLs after deployment:
   - `/`
   - `/about`
   - `/data`
   - `/insights`
   - `/newsletter`
   - `/robots.txt`
   - `/sitemap.xml`
   - `/llms.txt`
   - `/llms-full.txt`
   - `/ai/uk-electricity-mix.html`

## LLM/search ranking work now added

- `public/llms.txt` — concise LLM discovery file.
- `public/llms-full.txt` — fuller context for answer engines.
- `public/ai/uk-electricity-mix.html` — static crawlable HTML explainer for LLMs and crawlers that do not execute the SPA.
- Updated `public/sitemap.xml` should include the AI-readable files.
- Updated `public/robots.txt` should explicitly allow AI discovery files while keeping `/admin/` blocked.

## Next high-leverage SEO/LLM work

1. Add static/SSR crawlable answer pages for:
   - `/uk-electricity-mix`
   - `/uk-renewable-electricity`
   - `/uk-wind-generation-live`
   - `/uk-electricity-carbon-intensity`
   - `/uk-electricity-imports-exports`
2. Add a public API or static JSON endpoint summarising latest dashboard values if the data licence and source constraints allow it.
3. Add visible methodology text on the dashboard itself, not only Helmet metadata.
4. Improve internal linking from dashboard cards to explanatory pages.
5. Submit sitemap in Google Search Console and Bing Webmaster Tools after deployment.
6. Create source-backed insight articles targeting specific answer queries rather than generic “insights”.
7. Earn citations/backlinks from energy/climate/data communities once the refreshed site is stable.

## Known caveat

This is a Vite SPA. Google can render JavaScript, but some answer-engine/LLM crawlers may not. Static HTML and `llms.txt` assets are a pragmatic short-term fix; a stronger long-term fix would be prerendering/SSR for public SEO pages.
