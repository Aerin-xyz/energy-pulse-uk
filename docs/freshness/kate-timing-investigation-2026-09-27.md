# Matching Kate Morley's data freshness

Read-only investigation, 27 September 2026. No production schedule, cache or application settings changed during this investigation.

## Confirmed from published implementation

- [README](https://github.com/KateMorley/grid#cron): a five-minute CLI update job; writes a static homepage after updating sources. No evidence of a special privileged live feed or a requirement to fetch every minute.
- [Generation.php](https://github.com/KateMorley/grid/blob/master/classes/Data/Generation.php): uses Elexon FUELINST/stream, querying through actual current time; preserves the record's startTime for its observation label. Our paginated endpoint and the stream endpoint returned the same latest observation in a simultaneous check; switching endpoint alone is not a demonstrated fix.
- [Public browser script](https://grid.iamkate.com/grid.js?1786287504): assigns per-viewer jitter of 0–60 seconds; schedules refresh at two minutes plus jitter after each five-minute boundary. Requests `?v=` plus the common five-minute epoch slot, updates only for a newer observation timestamp, skips hidden-tab fetches, and refreshes on visibility changes.
- Live HTTP inspection at 17:53:33 UTC: Last-Modified 17:51:04, Expires 17:56:04, Cache-Control max-age=151; at 17:54:56 the same document had max-age=68. Cache time counts down to a shared expiry, rather than restarting a full five minutes per visitor. These are observed responses, not access to Kate's private server configuration.
- The page's actual `<time datetime>` was 17:45 UTC (18:45 BST). It is an observation label, not just an update timestamp.

## Isolated Energy Mix lag

At 17:53:22 UTC, simultaneous bounded-end, current-time and stream queries all returned observation **17:45**, publication **17:50**. Our database had completed ingestion at **17:50:09**, but still held observation **17:40**, publication **17:45**. Public edge data matched that database snapshot.

This isolates at least one lost cycle **before public delivery**: the boundary-time source request did not obtain the record subsequently available. It does not establish the exact first-availability second or prove whether provider-side response caching contributed. The rounded query cutoff did not permanently exclude the boundary publication: a later bounded query included it.

Our browser also polls five minutes after mounting rather than at a shared publication phase. Our edge response uses a fixed 300-second max-age. Consequently ingestion, edge and browser phases can stack. The current orchestrator waits for all national sources and enrichment (up to 90 seconds) before publishing; this is another possible delay, although the observed cycle completed quickly.

### Following publication boundary (UTC; add one hour for BST)

- 17:55:02: our next database snapshot completed, newest observation 17:45.
- 17:55:19: direct official stream still returned 17:45.
- 17:55:40: direct stream returned **17:50**, publication timestamp 17:55. Availability changed between those polls; this is a roughly 21-second bracket, not an exact first-publication time.
- 17:55:40 and 17:56:00: public Energy Mix cache still held **17:40**, despite the database having 17:45. Both ingestion and edge delays were therefore observed, not merely inferred from code.
- 17:56:07: Kate's page had regenerated at **17:56:04** and displayed observation **17:50**, with expiry 18:01:04. This second observed update is consistent with a minute-one server phase; exact private cron configuration is still unknown.

Bounded polling evidence is saved in the parent workspace's `artifacts/energy-mix-near-live-2026-09-27/publication-boundary-audit.json`. Checks were temporary read-only probes, not a new recurring monitor.

## Concrete recommended change

1. Keep one five-minute source cycle, initially phase it at minutes **1,6,11,…** rather than **0,5,10,…**, subject to boundary measurements. This is a proposed phase, not a verified claim about Kate's private cron configuration.
2. Query to actual current time and record per-source last attempt, newest observation, provider publication timestamp and first-seen timestamp. Do not use nominal publicationTime as proof of when an endpoint first returned a record.
3. Make cache generations follow a shared expected-release slot. Set remaining TTL to the next release boundary, not five minutes from an arbitrary request; do not accidentally allow a browser cache to extend the edge expiry. Keep conditional requests and a bounded dated fallback if a run fails.
4. Refresh visible browser tabs in a common post-ingestion window (Kate uses +2–3 minutes with jitter), including safe tab-resume handling. A shared slot URL must map to a bounded cache key, not arbitrary user-supplied keys or per-visitor nonces. No new origin request per visitor.
5. Publish fast national evidence independently of slower auxiliary enrichment, or use last-good auxiliary readings with their original timestamps. Preserve completed-period calculation semantics and revision/missing-value checks.
6. Verify several cycles across a half-hour boundary, including an already-open browser: compare official first-seen, database completion, public API and rendered observation. Track when we are a record behind. Avoid declaring parity from one coincident sample.

## Budget and expectation

Changing phase does not increase the number of scheduled invocations: the existing nominal baseline remains 17,280 per 30 days (orchestrator plus enrichment). Coordinated cache slots can preserve roughly one origin lookup per active edge location per cycle. Actual traffic/egress must still be measured; shared caching is not a free-tier guarantee.

Aim to be on the same latest available observation as Kate during the settled part of each cycle. A five-minute observation may itself be published around five minutes after its start, so publication-aware delivery does not create second-by-second telemetry. The earlier suggested 1–2 minutes after availability is a target requiring measurement, not an achieved SLA. Do not relax the delayed threshold to hide lag.
