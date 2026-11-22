import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {linkMeasurement,routeMeasurement} from '../src/lib/siteAnalytics.mjs';
test('analytics only emits bounded evidence, source and report metadata',()=>{
 assert.equal(linkMeasurement('mailto:person@example.com'),null);
 assert.equal(linkMeasurement('https://other.example/?token=private'),null);
 assert.deepEqual(linkMeasurement('/data/validation/reports/test/daily.csv?private=yes'),{name:'evidence_download',params:{file_path:'/data/validation/reports/test/daily.csv'}});
 assert.deepEqual(linkMeasurement('https://bmrs.elexon.co.uk/?private=yes'),{name:'source_click',params:{source_host:'bmrs.elexon.co.uk'}});
 assert.deepEqual(routeMeasurement('/reports/weekly/2026-11-16?private=yes'),{name:'report_view',params:{report_path:'/reports/weekly/2026-11-16/'}});
});
const report=JSON.parse(readFileSync('src/data/energyMixGenerated.json','utf8')).reports[0];
test('important evidence pages render real component content and dated history without JS',()=>{
 for(const path of ['explore','network-constraints','power-flow','wholesale-electricity-price','pumped-storage']){
  const s=readFileSync(`dist/${path}/index.html`,'utf8');assert.ok(s.includes('Sources, definitions and a validated reporting example'),path);assert.ok(s.includes('not a live reading'),path);assert.ok(s.includes(report.coverage.from),path);
 }
 const ai=readFileSync('dist/ai/uk-electricity-mix/index.html','utf8');assert.ok(ai.includes('Measured output is not notified output'));assert.ok(!ai.includes('"@type": "Dataset"'));
 assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('https://energymix.info/ai/uk-electricity-mix/'));
});
