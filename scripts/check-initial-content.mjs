// Read-only release/monitor check. Source age, cache-write age and HTML build
// age are distinct signals; an honestly unavailable HTML response is not fresh
// data and is not itself a source outage.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const dist = process.argv.slice(2).find(argument => !argument.startsWith('--')) || 'dist';
const readJson = path => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const ageMinutes = timestamp => {
  const time = Date.parse(timestamp || '');
  return Number.isFinite(time) ? Math.floor((Date.now() - time) / 60000) : null;
};
const routes = ['/', '/carbon-intensity/', '/today/', '/uk-wind-power-today/', '/uk-solar-power-today/'];
const pages = routes.map(route => {
  try {
    const file = join(dist, route, 'index.html'), html = readFileSync(file, 'utf8');
    const state = JSON.parse(html.match(/<script type="application\/json" id="initial-evidence">([\s\S]*?)<\/script>/)?.[1] || 'null');
    const honest = state?.schemaVersion === 1 && state?.status === 'unavailable' && state?.observation === null && html.includes('data-evidence-status="unavailable"') && !/Saved GB electricity snapshot|Latest static snapshot|Yesterday,/.test(html);
    return { route, status: honest ? 'honest-unavailable' : 'representation-mismatch', htmlFileAgeMinutes: ageMinutes(statSync(file).mtime.toISOString()) };
  } catch { return { route, status: 'missing-or-unreadable' }; }
});
const cache = readJson('public/data/grid-evidence.json');
const snapshot = readJson('src/data/staticGridSnapshot.json');
const sources = Object.fromEntries(Object.entries(cache?.sources || {}).map(([name, source]) => {
  const timestamps = (source.records || []).map(row => row.startTime || row.from || row.timestamp).filter(value => Number.isFinite(Date.parse(value))).sort();
  return [name, { checkedAt: source.checkedAt || null, refreshFailed: Boolean(source.error), latestRecordTimestamp: timestamps.at(-1) || null, latestRecordAgeMinutes: ageMinutes(timestamps.at(-1)) }];
}));
const ok = pages.every(page => page.status === 'honest-unavailable');
const report = { checkedAt: new Date().toISOString(), ok, pages, cacheGeneratedAt: cache?.generatedAt || null, cacheWriteAgeMinutes: ageMinutes(cache?.generatedAt), archivedSnapshotObservation: snapshot?.timestamp || null, archivedSnapshotAgeMinutes: ageMinutes(snapshot?.timestamp), sources, note: 'HTML freshness is deliberately unavailable, not inferred from build/cache-write success. Forecast dates must not be read as observation dates. This check does not activate ingestion or publication.' };
console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : `Initial content: ${ok ? 'PASS' : 'FAIL'} · ${pages.filter(page => page.status === 'honest-unavailable').length}/${pages.length} honest unavailable live pages; cache written ${cache?.generatedAt || 'unknown'}, archived snapshot ${snapshot?.timestamp || 'unknown'}. Source ages are separate; use --json for detail.`);
if (!ok) process.exitCode = 1;
