import {test} from 'node:test';import assert from 'node:assert/strict';import {assetReading} from '../src/lib/assetReadings.mjs';
const row=(bmUnit,quantity,extra={})=>({bmUnit,quantity,psrType:'Generation',settlementDate:'2026-09-07',settlementPeriod:48,settlementRunType:'II',...extra});
test('half-hour energy converts to MW; revisions are not double counted',()=>{const r=assetReading([row('a',10),row('a',12,{settlementRunType:'RF'}),row('b',5)],['a','b'],'2026-09-07',48);assert.equal(r.mw,34)});
test('incomplete, different-interval or nonnumeric units never manufacture a station total',()=>{for(const bad of [undefined,row('b',5,{settlementPeriod:47}),row('b',null)]){const r=assetReading([row('a',10),bad].filter(Boolean),['a','b'],'2026-09-07',48);assert.equal(r.mw,null);assert.equal(r.coverage,1)}});
test('measured zero and signed storage remain real readings',()=>{assert.equal(assetReading([row('a',0)],['a'],'2026-09-07',48).mw,0);assert.equal(assetReading([row('a',-5)],['a'],'2026-09-07',48).mw,-10)});

test('unmapped sites are unavailable, never a measured zero',()=>{assert.equal(assetReading([],[],'2026-09-07',48).mw,null)});

import fs from 'node:fs';
test('above-500 register has unique sites and units, sourced capacities and no retired Drax coal',()=>{
 const assets=JSON.parse(fs.readFileSync(new URL('../src/data/atlas/generation-assets.json',import.meta.url)));
 const ledger=JSON.parse(fs.readFileSync(new URL('../docs/generation-evidence-2026-09-15/over-500mw-register-extract.json',import.meta.url)));
 assert.equal(assets.length,47);assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 const units=assets.flatMap(a=>a.units);assert.equal(new Set(units).size,units.length);
 for(const a of assets){assert.ok(a.installedCapacityMW>500);assert.ok(['England','Scotland','Wales'].includes(a.country));assert.ok(a.latitude>49&&a.latitude<61);assert.ok(a.longitude> -9&&a.longitude<5);const rows=ledger.find(r=>r.id===a.id).dukesRows;assert.ok(Math.abs(rows.reduce((s,r)=>s+Number(r.H),0)-a.installedCapacityMW)<.001);assert.ok(a.capacitySource.startsWith('https://assets.publishing.service.gov.uk/'));}
 assert.deepEqual(assets.find(a=>a.id==='drax').units,['T_DRAXX-1','T_DRAXX-2','T_DRAXX-3','T_DRAXX-4']);
});
