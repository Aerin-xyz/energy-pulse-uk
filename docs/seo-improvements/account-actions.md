# Account-level actions and limits

## Confirmed diagnosis
The public GTM-K3QJHHTW container emits virtual_page_view as a custom event. An intercepted (aborted before delivery) production browser probe additionally observed a standard page_view after an asset-only history change. This is consistent with enhanced-measurement browser-history page views; it is not proof of duplicate pageviews on every route. The code now limits custom virtual_page_view to canonical pathname changes and omits query strings/hash from its payload.

## Reviewable GA4/GTM change specification
1. In GA4 web stream G-6C946559GE, verify Enhanced Measurement page-view advanced settings. Keep page loads; disable browser-history-based page views **only together with** the next item.
2. Change the existing GTM virtual_page_view-triggered GA4 event from event name virtual_page_view to page_view. Map page_location, page_path and page_title from the existing dataLayer event. Do not also add a second tag for the same trigger. Keep initial send_page_view=true.
3. Preview direct load → genuine route → query-only atlas/filter change → Back. Expected standard page_view counts: 1 → 2 → 2 → 3 when Back returns to a different route. Strict Mode, same-path slash variants and hash changes must not duplicate.
4. New report_view, evidence_download, source_click and atlas_asset_view commands use the existing Google tag and consent policy. They carry bounded paths/hosts, never full arbitrary URLs, asset searches or personal form data. Confirm them in DebugView after release. Newsletter success remains the existing provider success callback; form_start/submit are not subscriptions. Mark newsletter_signup_success as a key event only after checking that callback against the provider result.
5. Do not erase historical anomalies or block countries. Investigate the carbon-intensity engagement outlier with event/device/day segmentation and tag configuration. A fresh probe did not reproduce the 19-day total; its cause is not established. Use engaged organic sessions and successful actions meanwhile.

No Google account or GTM configuration was published in this implementation. Changing history collection in only one place risks losing or doubling pageviews, so the two-part account change needs a verified coordinated rollout, not a guessed code-only override.

## Search and other reporting
- After release, inspect current sitemap processing and submit the canonical sitemap using verified management access. Request inspection of the new report and improved priority URLs; ordinary URL Inspection API is read-only and is not an indexing-request API.
- Keep old withdrawn reports at 404/noindex; do not redirect them to unrelated new reports.
- Establish Bing Webmaster, Cloudflare verified-bot/WAF and newsletter-provider reporting access before claiming these are checked. Public robots allowance alone is not verified AI-crawler access.
- Preserve tracking consent and existing historical data. Tests abort analytics collection so acceptance runs do not add visitor events.

### Read-only account verification, 17 November
GA4 Admin API confirms `pageChangesEnabled: true`. Existing key events include newsletter_cta_click, newsletter_signup_submit, newsletter_signup_success, api_widget_waitlist_click and reports_cta_click (and purchase). Separate successful subscriptions from interest/submit actions in dashboards; zero key events is not proof of zero business value, and a submit is not proof of subscription. The GA4 settings read succeeded, but GTM accounts API returned HTTP403 with current reporting access. Therefore the paired production change remains blocked on authorised GTM management access. No scopes/permissions were expanded.
