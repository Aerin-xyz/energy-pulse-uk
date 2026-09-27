import {canonicalEnergy} from '../../../src/lib/evidence/canonicalEnergy.mjs';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {compactRows,retainedSource,truthfulFreshness,NATIONAL_KEY,ENERGY_KEY} from '../../../src/lib/evidence/ingestion.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Content-Type':'application/json'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'Scheduled POST only'}),{status:405,headers:cors});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const owner=crypto.randomUUID();
 const {data:claimed,error:claimError}=await db.rpc('claim_energy_ingestion',{run_owner:owner});
 if(claimError)return new Response(JSON.stringify({error:'Ingestion lease unavailable'}),{status:503,headers:cors});
 if(!claimed)return new Response(JSON.stringify({skipped:'Refresh already running or not due'}),{headers:cors});
 const now=Date.now(),at=new Date(now).toISOString();const outcomes:Record<string,string>={};
 try {
  const {data:cached}=await db.from('api_cache').select('cache_key,data').in('cache_key',[NATIONAL_KEY,ENERGY_KEY]);
  const prior=cached?.find(r=>r.cache_key===NATIONAL_KEY);let enrichment:any=cached?.find(r=>r.cache_key===ENERGY_KEY)?.data||{};
  const sources:Record<string,any>={};
  const get=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});if(!r.ok)throw Error(`Source HTTP ${r.status}`);return r.json()};
  await Promise.all([
   ...['FUELHH','INDO','FUELINST'].map(async code=>{
    const end=Math.floor(now/300000)*300000;
    const url='https://data.elexon.co.uk/bmrs/api/v1/datasets/'+code+'?'+new URLSearchParams({publishDateTimeFrom:new Date(end-6*3600000).toISOString(),publishDateTimeTo:new Date(end).toISOString(),format:'json'});
    try {
     const body=await get(url);const records=compactRows(code,body.data,now);
     const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(records)));
     if(code!=='FUELINST'){const rows=records.map((r:any)=>({source:code,start_time:r.startTime,series:code==='INDO'?'demand':r.fuelType,published_at:r.publishTime,value_mw:code==='INDO'?r.demand:r.generation}));const {error}=await db.from('grid_observations').upsert(rows,{onConflict:'source,start_time,series,published_at',ignoreDuplicates:true});if(error)throw Error('Canonical observation write failed');}
     const revision=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
     sources[code]={provider:'Elexon',datasetId:code,url,attribution:'Contains BMRS data © Elexon Limited copyright and database right 2026.',licence:'https://www.elexon.co.uk/bsc/operations-settlement/bsc-central-services/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/',coverage:code==='INDO'?'GB initial national demand':'GB transmission-metered; excludes embedded estimates',kind:'measured',unit:'MW',refreshMinutes:5,providerSchedule:code==='FUELINST'?'5-minute observations':'Half-hourly observations; subject to publication delay',checkedAt:at,revision,publishedAt:null,records};outcomes[code]='ok';
    }catch(e){sources[code]=retainedSource(prior?.data?.sources?.[code],e instanceof Error?e.message:'Source failed',at);outcomes[code]='retained';}
   }),
   (async()=>{
    // One enrichment call per cycle, not high/mid/full plus historical warmup.
    try {
     const r=await fetch(Deno.env.get('SUPABASE_URL')+'/functions/v1/energy-data?updateType=full',{signal:AbortSignal.timeout(90000)});
     if(!r.ok)throw Error('Enrichment request failed');const data=await r.json();
     if(!data.lastUpdated||!data.dataFreshness)throw Error('Invalid enrichment schema');
     enrichment=truthfulFreshness(data);outcomes.enrichment='ok';
    }catch{outcomes.enrichment='retained';}
   })()
  ]);
  if(Object.values(sources).some((s:any)=>s.checkedAt)){
   const generatedAt=new Date().toISOString();
   const national={schemaVersion:1,definitionVersion:'gb-evidence-v1',generatedAt,sources};
   const energy=canonicalEnergy(national,enrichment);
   // Publish both representations in one database statement.
   const {error}=await db.from('api_cache').upsert([{cache_key:NATIONAL_KEY,data:national},{cache_key:ENERGY_KEY,data:energy}].map(row=>({...row,updated_at:generatedAt,expires_at:new Date(Date.now()+48*3600000).toISOString()})),{onConflict:'cache_key'});
   if(error)throw Error('Snapshot publication failed');
  }
  const status=Object.values(outcomes).every(s=>s==='ok')?'succeeded':'partial';
  const {error}=await db.from('energy_ingestion_state').update({completed_at:new Date().toISOString(),lease_until:new Date().toISOString(),status,details:outcomes}).eq('name','national').eq('owner',owner);if(error)throw Error('Completion recording failed');
  console.log(JSON.stringify({event:'ingestion-complete',status,sources:outcomes}));
  return new Response(JSON.stringify({status,sources:outcomes}),{status:status==='succeeded'?200:207,headers:cors});
 }catch {
  await db.from('energy_ingestion_state').update({completed_at:new Date().toISOString(),lease_until:new Date().toISOString(),status:'failed',details:outcomes}).eq('owner',owner);
  return new Response(JSON.stringify({error:'Refresh failed; last-good data retained'}),{status:503,headers:cors});
 }
});
