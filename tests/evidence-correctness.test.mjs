import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {londonClock,londonTimestamp} from '../src/lib/evidence/timeLabels.mjs';
import {partitionCarbonRegions,postcodeDistrict} from '../src/lib/evidence/regionalCarbon.mjs';
import {cleanWindow,forecastWindowState,futurePeriods} from '../src/lib/gridMetrics.mjs';
import {reportCoverage} from '../src/lib/evidence/reportCoverage.mjs';
import {dayBounds} from '../src/lib/evidence/reportValidation.mjs';
import {carbonPresentation} from '../src/lib/evidence/carbon.mjs';
const now=Date.parse('2026-10-25T00:00:00Z');
const period=(start,minutes,intensity)=>({from:new Date(now+start*60000).toISOString(),to:new Date(now+(start+minutes)*60000).toISOString(),intensity:{forecast:intensity}});

test('repeated UK clock labels distinguish UTC instants across the autumn transition',()=>{
  assert.equal(londonClock('2026-10-25T00:00:00Z'),'01:00 BST (UTC+1)');
  assert.equal(londonClock('2026-10-25T01:00:00Z'),'01:00 GMT (UTC+0)');
  assert.notEqual(londonTimestamp('2026-10-25T00:30:00Z'),londonTimestamp('2026-10-25T01:30:00Z'));
  assert.equal(londonClock(null),'Time unavailable');
  const carbon=from=>carbonPresentation({actual:42,intervalFrom:from,intervalTo:new Date(Date.parse(from)+1800000).toISOString()},Date.parse('2026-10-25T03:00Z'));
  assert.match(carbon('2026-10-25T00:00Z').interval,/01:00 BST–01:30 BST/);
  assert.match(carbon('2026-10-25T01:00Z').interval,/01:00 GMT–01:30 GMT/);
});
test('expected local coverage is boundary-derived, while declared UTC days stay 48 periods',()=>{
  for(const [date,count] of [['2026-03-29',46],['2026-10-25',50],['2026-10-24',48]]){
    assert.equal(dayBounds(date,'Europe/London').count,count);
    assert.equal(dayBounds(date,'UTC').count,48);
  }
});
test('only comparable regions rank; country and GB aggregates never overlap the ranking',()=>{
  const data=[...Array.from({length:18},(_,i)=>({regionid:i+1,shortname:`Region ${i+1}`,intensity:{forecast:i>=14?0:30}})),{regionid:99,intensity:{forecast:0}}];
  const {ranked,countries}=partitionCarbonRegions(data);
  assert.deepEqual(ranked.map(r=>r.regionid),Array.from({length:14},(_,i)=>i+1));
  assert.deepEqual(countries.map(r=>r.regionid),[15,16,17]);
  assert.equal(partitionCarbonRegions([{regionid:1,intensity:{forecast:null}},{regionid:2,intensity:{forecast:-1}},{regionid:3,intensity:{forecast:0}}]).ranked.length,1);
});
test('full postcode controls send only the official API outward district',()=>{
  assert.equal(postcodeDistrict(' sw1a 1aa '),'SW1A');
  assert.equal(postcodeDistrict('SW1A'),'SW1A');
  assert.equal(postcodeDistrict('M1 1AE'),'M1');
  assert.equal(postcodeDistrict('EH1 1YZ'),'EH1');
  assert.equal(postcodeDistrict('not a postcode'),null);
});
test('forecast averages are duration-weighted and equal windows choose earliest UTC start',()=>{
  const rows=[period(0,15,20),period(15,45,100),period(60,60,80)];
  assert.equal(cleanWindow(rows,60,now).intensity,80);
  assert.equal(cleanWindow(rows.slice().reverse(),60,now).from,rows[0].from);
  assert.equal(cleanWindow(rows,0,now),null);
  assert.equal(cleanWindow(rows,NaN,now),null);
});
test('missing, conflicting and invalid forecast periods cannot be zero or historical substitutes',()=>{
  const gap=[period(-30,30,0),period(0,30,10),period(60,30,10)];
  assert.equal(forecastWindowState(gap,60,now).status,'incomplete');
  assert.equal(cleanWindow(gap,60,now),null);
  const p=period(0,30,10),next=period(30,30,20);
  assert.equal(cleanWindow([p,p,next],60,now).intensity,15);
  assert.equal(cleanWindow([p,period(0,30,9),next],60,now),null);
  assert.equal(cleanWindow([p,{...next,intensity:{actual:0,forecast:null}}],60,now),null);
  assert.equal(futurePeriods([period(0,30,-1)],now).length,0);
});
test('expired, failed and too-short horizons expose states and never return advice',()=>{
  assert.equal(forecastWindowState([period(-60,30,1)],60,now).status,'expired');
  assert.equal(forecastWindowState([],60,now).status,'unavailable');
  assert.equal(forecastWindowState([],60,now,{loading:true}).status,'loading');
  const rows=Array.from({length:6},(_,i)=>period(i*30,30,30+i));
  assert.equal(forecastWindowState(rows,180,now).window.intensity,32.5);
  assert.equal(forecastWindowState(rows,180,now,{error:true}).window,null);
  assert.equal(forecastWindowState(rows,180,now+1).status,'incomplete');
  assert.equal(forecastWindowState(rows,60,now).horizon.to,rows.at(-1).to);
});
test('all archived report windows are explicit without changing any publication data',()=>{
  const archive=JSON.parse(readFileSync(new URL('../src/data/reportArchive.json',import.meta.url)));
  const original=JSON.stringify(archive), coverage=archive.map(reportCoverage);
  assert.equal(coverage.filter(c=>c.status==='partial'&&c.days===6).length,124);
  assert.equal(coverage.filter(c=>c.status==='unknown'&&c.days===7).length,3);
  assert.equal(JSON.stringify(archive),original);
  assert.equal(coverage[0].from,'2026-09-23');
  assert.equal(coverage[0].to,'2026-09-28');
  assert.equal(coverage[0].timeBasis,'UTC');
  assert.match(coverage[0].definition,/excluding biomass/);
  assert.match(coverage[0].definition,/may include pumped-storage/);
  assert.match(coverage[0].validationIssue,/all-days check failed/);
});
test('unknown range remains unknown, year crossings resolve without using wall-clock time',()=>{
  assert.equal(reportCoverage({date:'2026-09-29',period:'unknown'}).status,'unknown');
  const c=reportCoverage({date:'2027-01-02',period:'Sunday 27 December to Friday 1 January'});
  assert.equal(c.from,'2026-12-27');assert.equal(c.to,'2027-01-01');assert.equal(c.days,6);
  assert.equal(c.timeBasis,'unverified');
});
