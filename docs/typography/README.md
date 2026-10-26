# Technical typography — 26 October 2026

Reference screenshot appears to show Archimoto V01, a commercial typeface. Selected Rajdhani by Indian Type Foundry as a similar angular/condensed open-licensed alternative; no commercial font purchase or licence assumed.

Self-hosted original Google Fonts Latin WOFF2 files, weights 400/500/600/700, with SIL OFL licence in public/fonts/rajdhani/OFL.txt. Shared interface family covers site chrome, homepage, interior pages, chart/map labels and newsletter styling. Monospace code/technical snippets and portable export fallbacks intentionally retain their specialist fonts. Existing Source Sans face remains as fallback. Preload actual common weights 500/600 instead of the former primary font. No runtime Google font requests; no data or motion changes.

Build and TypeScript passed. 19 existing product/initial-content/correctness browser checks passed. 14 page/viewport checks across six widths (320/390/430/768/1366/1920) and five page types verified Rajdhani loading, zero external font requests, no document overflow/runtime errors or detected contrast violations. Screens are actual local rendered previews using capture-time data. Not a physical-device or complete accessibility certification. No field performance claims.

Review-only: no merge or production deployment. User's standing review-before-release instruction retained.
