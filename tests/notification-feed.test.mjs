import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {notificationReading,validateNotificationMappings,buildNotificationFeed} from '../src/lib/notificationFeed.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));const mappings=read('src/data/atlas/notification-mappings.json'),assets=read('public/data/operational-assets.json').assets;
const registry=mappings.entries.flatMap(m=>m.registryEvidence);
const from='2026-09-24T17:00:00Z',to='2026-09-24T17:30:00Z',now=Date.parse(from)+1000;
const pn=(unit,value=0)=>({dataset:'PN',bmUnit:unit,timeFrom:from,timeTo:to,levelFrom:value,levelTo:value});
test('every catalogue entry strictly above 100MW has an explicit decision; no unit reused',()=>{
 assert.deepEqual(mappings.entries.map(m=>m.id).sort(),assets.filter(a=>a.installedCapacityMW>100).map(a=>a.id).sort());
 const units=mappings.entries.flatMap(m=>m.units);assert.equal(new Set(units).size,units.length);
 for(const m of mappings.entries){assert.ok(m.sourceIds.length);if(m.status==='verified')assert.ok(m.registryEvidence.length===m.units.length);else assert.equal(m.units.length,0)}
 assert.ok(!mappings.entries.find(m=>m.id==='drax').units.includes('T_DRAXX-5'));
 assert.deepEqual(mappings.entries.find(m=>m.id==='repd-2490').units,['T_GNFSW-1']);
});
test('runtime registry changes withhold schedules without changing measured verification',()=>{
 const clone=structuredClone(registry);clone.find(r=>r.elexonBmUnit==='T_DRAXX-1').leadPartyName='Changed';
 const validated=validateNotificationMappings(mappings,clone,assets);assert.equal(validated.find(m=>m.id==='drax').status,'review-required');assert.equal(validated.find(m=>m.id==='sizewell-b').status,'verified');
});
test('zero is a real notification; current half hour expires at its boundary; missing unit is never zero',()=>{
 const asset=assets.find(a=>a.id==='drax'),m=mappings.entries.find(m=>m.id===asset.id);
 const feed=buildNotificationFeed(m.units.map(u=>pn(u)),[m],from,to,from);
 assert.equal(notificationReading(asset,feed,now).mw,0);assert.equal(notificationReading(asset,feed,now).current,true);
 assert.equal(notificationReading(asset,feed,Date.parse(to)).current,false);
 assert.equal(notificationReading(asset,{...feed,records:feed.records.slice(1)},now).mw,null);
 assert.equal(notificationReading(asset,{...feed,mappings:[{...m,status:'review-required'}]},now).mw,null);
});
test('new schedule-only match never manufactures measured history',()=>{
 const asset=assets.find(a=>a.id==='repd-6502'),m=mappings.entries.find(m=>m.id===asset.id);
 const feed=buildNotificationFeed(m.units.map(u=>pn(u,12)),[m],from,to,from);
 assert.equal(notificationReading(asset,feed,now).mw,24);assert.equal(asset.unitMatch.status,'unmapped');
 assert.throws(()=>buildNotificationFeed([], [m],from,to,from));
});
