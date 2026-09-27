import {test} from 'node:test';import assert from 'node:assert/strict';
import {compactRows,retainedSource,truthfulFreshness} from '../src/lib/evidence/ingestion.mjs';
import {canonicalEnergy} from '../src/lib/evidence/canonicalEnergy.mjs';
import {DOMESTIC,INTERCONNECTORS,halfHours} from '../src/lib/evidence/calculations.mjs';
const now=Date.parse('2026-09-27T16:40:00Z');const startTime='2026-09-27T16:00:00Z',publishTime='2026-09-27T16:32:00Z';
const fuels=[...DOMESTIC,...INTERCONNECTORS,'PS'].map(fuelType=>({fuelType,generation:fuelType==='WIND'?10000:fuelType==='PS'?-200:fuelType==='INTFR'?-300:0,startTime,publishTime}));
const grid={generatedAt:'2026-09-27T16:35:00Z',sources:{FUELHH:{records:fuels},INDO:{records:[{startTime,publishTime,demand:11000}]}}};
test('canonical API uses exactly the homepage calculation, excludes imports/storage, preserves signs',()=>{
 const current=halfHours(fuels,grid.sources.INDO.records,now).at(-1);const api=canonicalEnergy(grid,{generationMix:[{name:'Imports',value:300}],totalGenerationMW:99999},now);
 assert.equal(api.totalGenerationMW,current.generationMW);assert.equal(api.totalDemandMW,current.demandMW);assert.equal(api.storage.netMW,-200);assert.equal(api.generationMix.find(x=>x.name==='Wind').percentage,100);assert.ok(!api.generationMix.some(x=>x.name==='Imports'));assert.equal(api.asOf.endISO,'2026-09-27T16:30:00.000Z');
});
test('missing source data remains null, zero is retained',()=>{
 const source=structuredClone(grid);source.sources.INDO.records=[];source.sources.FUELHH.records=fuels.filter(x=>x.fuelType!=='NUCLEAR');const api=canonicalEnergy(source,{},now);
 assert.equal(api.totalDemandMW,null);assert.equal(api.totalGenerationMW,null);assert.equal(api.generationMix.find(x=>x.name==='Gas').value,0);assert.equal(api.dataFreshness.sourceFreshness.demand.status,'unavailable');
});
test('failed source refresh preserves checked time, revision and zero reading',()=>{
 const prev={checkedAt:publishTime,revision:'old',records:[{generation:0}]};const value=retainedSource(prev,'timeout','2026-09-27T17:00Z');assert.equal(value.checkedAt,publishTime);assert.equal(value.revision,'old');assert.equal(value.records[0].generation,0);assert.equal(value.error,'timeout');
});
test('future and missing timestamps never gain live labels from a fresh fetch',()=>{
 const p=truthfulFreshness({dataFreshness:{isRealtime:true,sourceFreshness:{generation:{timestamp:null,status:'live',cadenceMinutes:5},price:{timestamp:'2026-09-27T17:00Z',status:'live'},carbon:{timestamp:'2026-09-27T14:00Z',cadenceMinutes:30}}}},now);
 assert.equal(p.dataFreshness.isRealtime,false);assert.equal(p.dataFreshness.sourceFreshness.price.status,'unavailable');assert.equal(p.dataFreshness.sourceFreshness.carbon.status,'delayed');
});
test('ingestion rejects unknown units/null output and future revisions without converting to zero',()=>{
 const records=compactRows('FUELHH',[...fuels,{startTime,publishTime,generation:null},{startTime,publishTime:'2026-09-28T00:00Z',generation:12}],now);assert.equal(records.length,fuels.length);assert.ok(records.some(x=>x.generation===0));assert.throws(()=>compactRows('INDO',[{startTime,publishTime,demand:null}],now));
});
