import fs from 'node:fs/promises';import {cachedJSON,atomicJSON} from './evidence/cache.mjs';
import {VERSION,normalizeBoundaries} from '../src/lib/evidence/calculations.mjs';
const target=process.env.GRID_EVIDENCE_TARGET||'public/data/grid-evidence.json',now=Date.now(),sources={};let previous={sources:{}};try{previous=JSON.parse(await fs.readFile(target,'utf8'))}catch{}
async function collect(key,fn){try{sources[key]=await fn();if(!sources[key].records.length)throw Error('No validated records');}catch(e){sources[key]={...(previous.sources[key]||{records:[],checkedAt:null}),error:e.message,lastAttemptAt:new Date().toISOString()};console.warn(key,e.message)}}
async function neso(name,resourceId,sort,limit=4096){
 const meta=await cachedJSON('https://api.neso.energy/api/3/action/package_show?id='+name);if(!meta.value.success)throw Error('NESO metadata unavailable');const p=meta.value.result;
 const resource=resourceId?p.resources.find(r=>r.id===resourceId):p.resources.filter(r=>r.datastore_active&&r.name.includes('Thermal Constraint Costs Data')).sort((a,b)=>Number(b.name.match(/(\d{2})-\d{2}$/)?.[1]||0)-Number(a.name.match(/(\d{2})-\d{2}$/)?.[1]||0))[0];if(!resource?.datastore_active)throw Error('NESO resource contract changed');
 const url='https://api.neso.energy/api/3/action/datastore_search?'+new URLSearchParams({resource_id:resource.id,limit:String(limit),sort});
 const data=await cachedJSON(url);if(!data.value.success||!Array.isArray(data.value.result.records))throw Error('Invalid NESO records');
 const fields=new Set(data.value.result.fields.map(f=>f.id));const required=name==='thermal-constraint-costs'?['Settlement Date','Constraint Group','Daily Cost (GBP)']:name==='operational-transparency-forum-network-congestion-data'?['Date','B6 - Actual','B6 - Forecast']:['Constraint Group','Date_ Time GMT_BST','Limit_MW','Flow_MW'];if(required.some(f=>!fields.has(f)))throw Error('NESO field contract changed');
 return {attribution:'Supported by National Energy SO Open Data',provider:'NESO',datasetId:p.id,resourceId:resource.id,url:resource.url,apiUrl:url,licence:p.license_url,coverage:'GB published boundaries only',refreshMinutes:60,providerSchedule:p.extras?.find(x=>x.key.toLowerCase()==='update frequency')?.value||'See provider metadata',checkedAt:data.checkedAt,resourceModifiedAt:resource.last_modified||null,publishedAt:null,publicationNote:'Provider resource modification time; row publication time not supplied',revision:data.revision,fields:data.value.result.fields,records:data.value.result.records};
}
async function elexon(code){
 const end=Math.floor(now/300000)*300000;
 const url='https://data.elexon.co.uk/bmrs/api/v1/datasets/'+code+'?'+new URLSearchParams({publishDateTimeFrom:new Date(end-6*3600000).toISOString(),publishDateTimeTo:new Date(end).toISOString(),format:'json'});
 const data=await cachedJSON(url,300000);if(!Array.isArray(data.value.data))throw Error('Invalid Elexon schema');return {attribution:'Contains BMRS data © Elexon Limited copyright and database right 2026.',provider:'Elexon',datasetId:code,url,licence:'https://www.elexon.co.uk/bsc/operations-settlement/bsc-central-services/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/',coverage:code==='INDO'?'GB initial national demand, not gross embedded-enriched demand':'GB transmission-metered; excludes embedded generation estimates',refreshMinutes:15,providerSchedule:code==='FUELINST'?'5-minute observations':'Half-hourly observations; subject to publication delay',checkedAt:data.checkedAt,publishedAt:null,resourceModifiedAt:null,revision:data.revision,kind:'measured',unit:'MW',records:data.value.data};
}
await Promise.all([
 collect('dayAhead',async()=>{const s=await neso('day-ahead-constraint-flows-and-limits','38a18ec1-9e40-465d-93fb-301e80fd1352','Date_ Time GMT_BST desc');return {...s,kind:'forecast',unit:'MW',records:normalizeBoundaries(s.records)}}),
 collect('congestion',async()=>({...await neso('operational-transparency-forum-network-congestion-data','aa9d4303-b7ec-4881-be07-16bad8824ab6','Date desc',100),kind:'published-limit',unit:'MW'})),
 collect('costs',async()=>({...await neso('thermal-constraint-costs',null,'Settlement Date desc',300),kind:'retrospective-cost',unit:'GBP'})),
 ...['FUELHH','INDO','FUELINST'].map(code=>collect(code,()=>elexon(code)))
]);
await atomicJSON(target,{schemaVersion:1,definitionVersion:VERSION,generatedAt:new Date().toISOString(),sources});console.log('Cached grid evidence:',Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{rows:v.records.length,error:v.error||null}])));
if(Object.values(sources).every(s=>s.error))process.exitCode=1;
