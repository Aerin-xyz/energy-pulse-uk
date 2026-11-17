import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {validateModules,aggregateModules,VERSION,BASIS} from '../src/lib/evidence/reportModules.mjs';
import {dayBounds,nextDate} from '../src/lib/evidence/reportValidation.mjs';
export const sha=x=>createHash('sha256').update(x).digest('hex');
export const validatorHash=()=>sha(Buffer.concat(['../src/lib/evidence/reportModules.mjs','../src/lib/evidence/reportValidation.mjs','../supabase/functions/_shared/settlementTime.mjs'].map(p=>readFileSync(new URL(p,import.meta.url)))));
export async function collectReport({end,days=7,outRoot='public/data/validation/reports',fetcher=fetch,now=new Date().toISOString()}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(end+'T12:00Z'))||new Date(end+'T12:00Z').toISOString().slice(0,10)!==end||!Number.isInteger(days)||days<1||days>7)throw Error('Invalid bounded report window');
 const dates=Array.from({length:days},(_,i)=>new Date(Date.parse(end+'T12:00Z')-(days-1-i)*86400000).toISOString().slice(0,10));
 if(Date.parse(dayBounds(end,'Europe/London').to)>Date.parse(now))throw Error('Reporting day not complete');
 const artifacts=[],payloads=new Map();
 async function get(name,url){
  const r=await fetcher(url,{signal:AbortSignal.timeout(30000),redirect:'error'});if(!r.ok)throw Error('Source HTTP '+r.status);
  const reader=r.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16*1024*1024){await reader.cancel();throw Error('Source response too large');}chunks.push(value);}
  const raw=Buffer.concat(chunks),file=name+'.json.gz';payloads.set(file,gzipSync(raw));artifacts.push({file,url,retrievedAt:new Date().toISOString(),sha256:sha(raw),bytes:raw.length});return JSON.parse(raw);
 }
 const from=dayBounds(dates[0],'Europe/London').from;let elexon,eError;
 try{elexon=[];let i=0;for(let at=Date.parse(from);at<Date.parse(now);at+=4*86400000){
 const to=Math.min(at+4*86400000,Date.parse(now));const j=await get('elexon-'+i++,'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH?'+new URLSearchParams({publishDateTimeFrom:new Date(at).toISOString(),publishDateTimeTo:new Date(to).toISOString(),format:'json'}));if(!Array.isArray(j.data))throw Error('Malformed Elexon response');elexon.push(...j.data);
 }}catch(e){eError=e.message;}

 const results=[];
 for(const date of dates){const b=dayBounds(date,'Europe/London'),errors={};if(eError)errors.elexon=eError;let neso,carbon;
  const sql=`SELECT * FROM "177f6fa4-ae49-4182-81ea-0c6b35f26ca6" WHERE "SETTLEMENT_DATE" = '${date}' ORDER BY "SETTLEMENT_PERIOD"`;
  try{const j=await get(date+'-neso','https://api.neso.energy/api/3/action/datastore_search_sql?sql='+encodeURIComponent(sql));if(j.success!==true||!Array.isArray(j.result?.records))throw Error('Malformed NESO response');neso=j.result.records;}catch(e){errors.neso=e.message;}
  try{const j=await get(date+'-carbon','https://api.carbonintensity.org.uk/intensity/'+b.from+'/'+b.to);if(!Array.isArray(j.data))throw Error('Malformed carbon response');carbon=j.data;}catch(e){errors.carbon=e.message;}
  results.push({...validateModules(date,{elexon,neso,carbon,errors}),sourceErrors:errors});
 }
 const modules=aggregateModules(results);
 const manifest={schemaVersion:3,validatorVersion:VERSION,validatorSha256:validatorHash(),runAt:now,date:end,reportDate:end,status:modules.metered.status==='passed'?'passed':'failed',publicationStatus:'provisional; source records may be revised',period:{from:dates[0],to:end,timeBasis:'Europe/London'},basis:BASIS,days:results,modules,artifacts,limitations:['Source-faithful arithmetic and interval checks are not independent certification of meters.','NESO embedded estimates are separate; no whole-system total or renewable share combines them with Elexon.','Missing optional data does not prevent publication of a complete metered module.','Carbon is a time-weighted mean of published actual intensity, not energy-weighted or marginal emissions.'],attribution:['Contains BMRS data © Elexon Limited copyright and database right 2026.','NESO Demand Data Update, National Energy System Operator Open Data.','Carbon Intensity API: https://carbonintensity.org.uk/']};
 const id=sha(JSON.stringify(manifest)).slice(0,20),dest=join(outRoot,end,id);mkdirSync(dest,{recursive:true});for(const [name,body]of payloads)writeFileSync(join(dest,name),body);
 writeFileSync(join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const csv=['date,time_basis,periods,metered_status,metered_mwh,metered_average_mw,wind_hydro_share_percent,solar_status,solar_estimate_mwh,embedded_wind_status,embedded_wind_estimate_mwh,carbon_status,mean_actual_gco2_per_kwh',...results.map(d=>[d.date,d.bounds.basis,d.bounds.count,d.modules.metered.status,d.modules.metered.totalMWh??'',d.modules.metered.averageMW??'',d.modules.metered.renewableShare??'',d.modules.solar.status,d.modules.solar.totalMWh??'',d.modules.embeddedWind.status,d.modules.embeddedWind.totalMWh??'',d.modules.carbon.status,d.modules.carbon.meanActualGCO2PerKWh??''].join(','))].join('\n');
 writeFileSync(join(dest,'daily.csv'),csv+'\n');return {...manifest,evidencePath:`/data/validation/reports/${end}/${id}/manifest.json`,dailyCsv:`/data/validation/reports/${end}/${id}/daily.csv`,localManifest:join(dest,'manifest.json')};
}
