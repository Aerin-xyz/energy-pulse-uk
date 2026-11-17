# Public archive reset — 17 November 2026

User requested withdrawal of the old archive and a fresh baseline using the validated report published today.

- Retained `/reports/weekly/2026-11-16/` (10–16 November), unchanged including source evidence.
- Withdrew 127 earlier report entries and their legacy September validation downloads.
- Removed their sitemap/static routes. Existing Cloudflare archive route returns 404/noindex for withdrawn URLs, without substitution.
- Updated the Records link to the reports index.
- Recovery remains available in git at pre-reset main `81eb54bce030ce86e5ef1fa1e9320b7c2ebf803c`; a filesystem backup was also retained outside the public website.
- Future successful report refreshes append to this new baseline; the generator does not backfill removed entries.

Validation: build and TypeScript, 133 regression/security tests, 10 initial-content tests, and 3 browser checks (current report on phone/desktop and withdrawn route). All passed. Checked all 127 removed slugs against the generated route manifest; retained report matches the pre-reset entry exactly.

No change to live feeds, metric definitions, source-validation rules, or Phase 1 ingestion.
