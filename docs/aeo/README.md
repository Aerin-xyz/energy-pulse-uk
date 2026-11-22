# AEO implementation — 22 November 2026

Status: prepared for review; not deployed. No CSS, typography, colour, navigation or map-layout changes. PR15 ingestion and GA4/GTM account settings are untouched.

## Delivered
- Wind/gas historical context selected by named metered metric; solar by validated solar module, not optional highlight position. Missing modules explicitly unavailable. No source totals or archived reports rewritten.
- Existing wind/solar/GB-mix/interconnector/carbon explanations tightened; direct official source and dated report citations on insight pages. Removed misleading settled/final wording in touched content. Wind and solar retain the existing four-card component and styling with topic-specific content.
- Report index now calls the series rolling seven-day reports and describes supported metrics rather than promising unsupported demand peaks/cleanest windows.
- Narrow Cloudflare Pages middleware for the five existing answer URLs. Reads the existing aligned /api/energy-data cache loader (no new source ingestion or schedule), validates observation/basis/freshness and rewrites the existing unavailable panel with a timestamped answer. Same response for humans and bots. HTML is private/no-store; underlying shared data retains its existing cache cadence. Source errors retain truthful unavailable HTML. JSON payload is escaped and browser fallback reads the same answer until normal source refresh. Other routes are passed through unchanged.
- Current answer model for metered mix/wind, reported actual carbon and complete country-group transfers. The canonical cache does NOT supply a verified solar observation; solar remains unavailable, with separately dated NESO report estimate below. No missing solar is represented as zero, and no new source requests added to fill that gap.

## Verification
Build and TypeScript passed. All 125 node tests passed, including eight focused tests for zero/missing/stale/future/basis, DST interval semantics, partial transfers, carbon actual vs forecast, HTML escaping and report highlight independence. Fixed an existing SEO test's frozen report date so it checks the generated report's actual period.
Cloudflare local runtime compiled and served request-time HTML using the real shared cache. 25 browser checks passed: five answer pages at phone/desktop widths; no-JS source/answer content; browser startup with API failure; eight map-first widths; maximum-zoom/capacity/network-name regressions. Screenshots retained here; inspected phone wind layout. No page errors or overflow in sampled target pages.

## External work not completed
- Cloudflare Wrangler OAuth exists, but enumerated scopes lack security-event/firewall-rule access. No authenticated dashboard browser on local debug port. Protected secret store has no Cloudflare token. Perplexity user-agent probes were Cloudflare403 while Google/Bing/OpenAI probes were200; simulated user agents do not prove real verified crawler denial. Need Cloudflare Security Events read access to identify the rule and propose a narrow fix. Do not disable WAF or allow unverified user-agent names. No security settings changed.
- Citation baseline: provider connector lacks configured search credential. Anonymous web probes recorded in search-access*.json; ChatGPT returned403, Bing produced unrelated results and is not a reliable ranking observation. Public Perplexity browser baseline completed: ten fixed questions in fresh anonymous sessions, all ten answers observed, no energymix.info citation links or textual mentions. This is one provider/sample, not proof of absence across AI search. Full observed answers and cited URLs are in perplexity-panel.json; externally generated claims were not adopted as source truth. ChatGPT remained inaccessible. Never count unavailable answers as zero citations. No paid APIs, automated recurring probes, or outreach enabled.
- Google/Bing sitemap/index checks should follow approved deployment. No sitemap submitted for unreleased content.

## Release / rollback
Review this isolated branch, then merge/deploy on approval and run production no-JS HTML, freshness, phone/desktop and map checks. Check middleware cache headers and served timestamps. Revert this commit to roll back; no database migration required.
