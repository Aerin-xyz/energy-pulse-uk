// Read-only official-source reconciliation; no credentials, database writes or publication.
import fs from 'node:fs/promises';
import {collectSource} from '../src/lib/operations/transport.mjs';
import {parseSource,reconcileVolumes,mapUnits} from '../src/lib/operations/adapters.mjs';
import {expectedPeriods,requireDate,sha256} from '../src/lib/operations/contracts.mjs';
const date=requireDate(process.argv[2]||'2026-10-25');
const dir=process.env.OPERATIONS_PROBE_DIR||'docs/grid-intelligence/phase1-validation';await fs.mkdir(dir,{recursive:true});
const sources={};async function collect(dataset,scope){const s=await collectSource(dataset,scope);await fs.writeFile(`${dir}/${dataset}-${scope.period||scope.date||'reference'}.json`,JSON.stringify(s,null,2));return s;}
sources.prices=await collect('DISEBSP',{date});const periods=[1,Math.ceil(expectedPeriods(date)/2),expectedPeriods(date)];const comparisons=[];
for(const period of periods){
 const scope={date,period};const bids=await collect('BOAV-bid',scope),offers=await collect('BOAV-offer',scope),instructions=await collect('BOALF',scope);
 const price=sources.prices.records.find(r=>r.settlementPeriod===period);if(!price)throw Error('No system price for comparison period');
 comparisons.push({period,...reconcileVolumes(price,bids.records,offers.records),bids:bids.records.length,offers:offers.records.length,instructions:instructions.records.length,bytes:bids.sourceBytes+offers.sourceBytes+instructions.sourceBytes});
 for(const s of [bids,offers,instructions])if(JSON.stringify(parseSource(s.dataset,s.raw,s.scope).records)!==JSON.stringify(s.records))throw Error('Replay mismatch');
}
const ref=await collect('BMUNITS',{});const mapping=JSON.parse(await fs.readFile('src/data/atlas/notification-mappings.json','utf8')).entries||[];const references=mapUnits(ref.records,mapping);const counts={};for(const r of references)counts[r.mappingConfidence]=(counts[r.mappingConfidence]||0)+1;
const result={checkedAt:new Date().toISOString(),date,expectedPeriods:expectedPeriods(date),returnedPeriods:sources.prices.records.length,priceCoverage:sources.prices.coverage,comparisons,reference:counts,sourceIdentityHash:await sha256(references),limitations:['Selected official periods cross-reconciled; not independent certification of Elexon.','BOALF levels are instructions, never converted into metered output or accepted volume.','Unknown mappings remain unmapped.','A complete day price series does not imply a complete action history.']};
await fs.writeFile(dir+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(comparisons.some(r=>r.status!=='matched')||sources.prices.coverage!=='complete')process.exitCode=1;
