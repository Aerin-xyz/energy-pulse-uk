import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {dayBounds,nextDate,validateDay,summarizeDays,carbonDay} from '../src/lib/evidence/reportValidation.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function validateReportAllDays(rows,{outRoot='public/data/validation/reports',reportDate=rows.at(-1)?.settlementDate,fetcher=fetch}={}){
 if(!rows.length||rows.length>7)throw Error('Expected one to seven reporting days');
 const ordered=[...rows].sort((a,b)=>a.settlementDate.localeCompare(b.settlementDate));
 if(new Set(ordered.map(r=>r.settlementDate)).size!==ordered.length)throw Error('Duplicate reporting day');
 for(let i=1;i<ordered.length;i++)if(ordered[i].settlementDate!==nextDate(ordered[i-1].settlementDate))throw Error('Missing day inside reporting range');
 if(new Set(ordered.map(r=>r.timeBasis||'UTC')).size!==1)throw Error('Mixed reporting time bases');
 const runAt=new Date().toISOString(),staging=join(outRoot,'.pending-'+Date.now());mkdirSync(staging,{recursive:true});
 const artifacts=[];
 const save=(name,body,url,retrievedAt)=>{const raw=Buffer.from(body),sha256=hash(raw),file=name+'.json.gz';writeFileSync(join(staging,file),gzipSync(raw));const a={file,url,retrievedAt,sha256,bytes:raw.length};artifacts.push(a);return JSON.parse(raw);};
 save('report-input',JSON.stringify(ordered),'Energy Mix report input',runAt);
 const get=async(name,url)=>{const r=await fetcher(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Source HTTP '+r.status);const raw=await r.text();return save(name,raw,url,new Date().toISOString());};
 // Metadata documents NESO DATETIME explicitly as UTC; retain it with the evidence.
 let metadata;try{metadata=await get('neso-metadata','https://api.neso.energy/api/3/action/datastore_search?resource_id=f93d1835-75bc-43e5-84ad-12472b180a98&limit=1');if(!metadata.success||!metadata.result?.fields?.find(f=>f.id==='DATETIME')?.info?.description?.includes('UTC'))throw Error('NESO UTC basis not confirmed');}catch(e){throw Error('Cannot establish NESO time basis: '+e.message);}
 const days=[];
 for(const row of ordered){const date=row.settlementDate,b=dayBounds(date,row.timeBasis||'UTC');if(Date.parse(b.to)>Date.now())throw Error('Incomplete reporting day '+date);
  const eurl='https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH?'+new URLSearchParams({publishDateTimeFrom:b.from,publishDateTimeTo:runAt,format:'json'});
  const sql=`SELECT * FROM "f93d1835-75bc-43e5-84ad-12472b180a98" WHERE "DATETIME" >= '${b.from}' AND "DATETIME" < '${b.to}' ORDER BY "DATETIME"`;
  const nurl='https://api.neso.energy/api/3/action/datastore_search_sql?sql='+encodeURIComponent(sql);
  try{const [e,n]=await Promise.all([get(date+'-elexon',eurl),get(date+'-neso',nurl)]);if(!Array.isArray(e.data)||n.success!==true||!Array.isArray(n.result?.records))throw Error('Malformed source response');days.push(validateDay(row,e.data,n.result.records));}
  catch(e){days.push({date,bounds:b,status:'failed',checks:[{id:'source.fetch',status:'fail',detail:e.message}]});}
 }
 for(const d of days){try{const url='https://api.carbonintensity.org.uk/intensity/'+d.bounds.from+'/'+d.bounds.to;const raw=await get(d.date+'-carbon',url);if(!Array.isArray(raw.data))throw Error('Malformed carbon response');d.carbon=carbonDay(raw.data,d.bounds);}catch(e){d.carbon={status:'unavailable',meanActualGCO2PerKWh:null,errors:[e.message]};}}
 const summary=summarizeDays(days);if(summary.status==='passed'&&days.some(d=>d.carbon.status!=='passed'))summary.status='warning';const manifest={schemaVersion:1,validatorVersion:'all-days-v1',validatorSha256:hash(readFileSync(new URL('../src/lib/evidence/reportValidation.mjs',import.meta.url))),attribution:['Contains BMRS data © Elexon Limited copyright and database right 2026.','NESO Historic GB Generation Mix: National Energy System Operator Open Data.','Carbon Intensity API: https://carbonintensity.org.uk/'],reportDate,runAt,sourceInputHash:artifacts[0].sha256,period:{from:ordered[0].settlementDate,to:ordered.at(-1).settlementDate,timeBasis:ordered[0].timeBasis||'UTC'},...summary,days,artifacts,limitations:['Elexon and NESO share underlying observations; this is cross-checking, not independent certification.','Historical report feed exposes daily aggregates: raw official half-hours are reconciled with each other, and Energy Mix daily aggregates are checked against their integrals.','Historical carbon actuals are checked separately for complete intervals; missing actuals are never replaced by forecasts. Carbon rankings must be withheld unless every reporting day has complete actuals.','Renewable share excludes biomass; natural hydro excludes pumped storage.','Daily fuel-energy tolerance: 0.1% or 1 MWh; solar 2% or 12 MWh. Interval provider comparison: 0.1% or 1 MW.']};
 const runId=hash(JSON.stringify(manifest)).slice(0,20),dest=join(outRoot,reportDate,runId);mkdirSync(dest,{recursive:true});
 // Content-addressed run: never overwrite an earlier evidence run.
 for(const a of artifacts){const target=join(dest,a.file);if(!existsSync(target))writeFileSync(target,readFileSync(join(staging,a.file)));}
 const csv=['date,time_basis,periods,status,total_mwh,average_mw,renewable_share_percent',...days.map(d=>[d.date,d.bounds.basis,d.bounds.count,d.status,d.recalculated?.totalMWh??'',d.recalculated?.averageMW??'',d.recalculated?.renewableShare??''].join(','))].join('\n');
 writeFileSync(join(dest,'daily.csv'),csv+'\n');writeFileSync(join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const {rmSync}=await import('node:fs');rmSync(staging,{recursive:true});
 return {...manifest,evidencePath:`/data/validation/reports/${reportDate}/${runId}/manifest.json`,dailyCsv:`/data/validation/reports/${reportDate}/${runId}/daily.csv`};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const input=process.argv[2];if(!input)throw Error('Usage: node scripts/validate-report-all-days.mjs input.json [output-dir] [report-date]');
 const body=JSON.parse(readFileSync(input)),rows=Array.isArray(body)?body:body.data;
 const result=await validateReportAllDays(rows,{outRoot:process.argv[3]||'public/data/validation/reports',reportDate:process.argv[4]});console.log(JSON.stringify({status:result.status,days:result.days.map(d=>({date:d.date,status:d.status,failed:d.checks.filter(c=>c.status==='fail').map(c=>c.id)})),evidencePath:result.evidencePath},null,2));if(result.status==='failed')process.exitCode=1;
}
