// Shared UTC slots. Ingestion +60s, edge release +90s, browser +120–150s.
export const CYCLE_MS = 300000;
export function releaseSlot(now = Date.now()) { return Math.floor((now - 90000) / CYCLE_MS); }
export function releaseTTL(now = Date.now()) { return Math.max(1, Math.ceil(((releaseSlot(now) + 1) * CYCLE_MS + 90000 - now) / 1000)); }
export function nextBrowserRefresh(now = Date.now(), jitter = 0) {
 const phase = 120000 + Math.max(0, Math.min(30000, jitter));
 return (Math.floor((now - phase) / CYCLE_MS) + 1) * CYCLE_MS + phase;
}
