# SEO and AI discoverability improvements — 17 November 2026

## Scope and release status
Implemented for review at the user's request, preserving the existing visual identity, map-first composition, fonts, colours, navigation and data definitions. Not deployed. Phase1/PR15 and report-generation cadence are untouched.

## Delivered
- Actual page-component initial HTML for Explore, power flow, constraints, wholesale price, pumped storage, About and Contact. Browser-only debug panel guarded for server rendering.
- Existing map rendered from the start, eliminating the placeholder-to-map jump; initial page chunks resolved before replacing useful pre-rendered content. A failed chunk leaves readable content in place. Forecast plotting space reserved while data loads.
- Collapsible source/definition disclosure below the existing interface, including a reproducible dated example from the validated report. No stale build snapshot is passed off as current output; the live source/freshness contract stays unchanged.
- Homepage search title/description clarified without changing its visible heading. Record titles and source notes clarified as reporting-window highs, not all-time records. Methodology updated for the validated reporting baseline.
- Report Article metadata connects to real CSV and JSON evidence with geographic/temporal coverage. Removed generic dashboard Dataset markup rather than inventing a licence; no new blanket redistribution rights asserted.
- AI summary refreshed with measured/notified and GB coverage distinctions; canonical links refreshed in AI discovery files; AI summary included in sitemap and route manifest.
- Custom route tracking uses canonical pathname only, not query/filter/hash changes. Bounded report_view, evidence_download, source_click and atlas_asset_view events added through the existing Google tag/consent mechanism. No arbitrary query values or form data included.
- Read-only GA4 inspection, analytics diagnosis, coordinated GTM rollout specification, weekly measurement scorecard and unsent editorial promotion brief.

## Verification
- Build, TypeScript and 136 unit/security/initial-content checks passed.
- 5 targeted browser checks passed: phone/desktop design and source-evidence report, plus filter-change analytics privacy check.
- 29 existing map regressions passed: visibility, sizing, map-first layout, fullscreen, maximum zoom, capacity filters and label collision handling.
- Final local Chromium samples (390/1366px, unthrottled, analytics blocked, public API reads proxied): homepage CLS0.0004/0.0062; constraints0.0397/0.0166. Prior intermediate mobile homepage sample0.0873 demonstrates run-to-run variation. These are lab samples, not fieldCWV certification or a controlled production speed comparison. No overflow in sampled pages. See layout-after.json.
- Screenshots retain the established appearance. Targeted UI tests deliberately cover unavailable data locally; live source freshness is not inferred from screenshots.
- Existing generated report values and source evidence unchanged.

## Remaining external dependencies / not claimed complete
GTM API access returns403. GA4 confirms browser-history automatic page views are on; its paired GA4/GTM change is specified in account-actions.md but not published. Signup-submit is currently a key event as well as signup-success; dashboards must distinguish interest from confirmed subscription. The historical engagement-duration outlier is not repaired or deleted, and its exact origin remains unproven.

No sitemap submission/index request, paid provider, newsletter campaign, outreach, permission expansion, new monitoring schedule or public release was performed. Bing Webmaster, Cloudflare verified-crawler logs and newsletter-provider reporting still require verified access; fieldCWV and an AI citation panel are not claimed available.

After approval: deploy this site release, perform live routing/map/citation and event checks, then coordinate the separately blocked tag-manager settings. Submit/check the refreshed sitemap after deployment. Never turn off history collection alone before replacement route pageviews are ready.

Rollback: revert the release commit; no database migration or source-data rewrite is involved.
