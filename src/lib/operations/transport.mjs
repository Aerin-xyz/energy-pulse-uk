import {sha256,instant,freshness,stable} from './contracts.mjs';
import {parseSource,sourceRequest} from './adapters.mjs';
const ALLOWED_HOSTS=new Set(['data.elexon.co.uk','api.neso.energy']);
export async function fetchBoundedJSON(url,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now(),attempts=3,maxBytes=4*1024*1024}={}){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||!ALLOWED_HOSTS.has(parsed.hostname)||parsed.username||parsed.password)throw Error('Source host not allowed');
 attempts=Math.max(1,Math.min(3,attempts));
 let last;for(let attempt=0;attempt<attempts;attempt++){
  let delay=250*(2**attempt);
  try{
   const r=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'application/json'}});
   if(!r.ok){const retry=r.status===429||r.status>=500;const error=new Error('Source HTTP '+r.status);error.retryable=retry;
    const after=r.headers.get('Retry-After');if(after){const wait=/^\d+$/.test(after)?Number(after)*1000:Date.parse(after)-now();if(Number.isFinite(wait)&&wait>3000){error.retryable=false;error.retryAfter=after;}else if(Number.isFinite(wait))delay=Math.max(0,wait);}
    throw error;
   }
   if(Number(r.headers.get('Content-Length'))>maxBytes)throw Object.assign(Error('Source size budget exceeded'),{retryable:false});
   const reader=r.body.getReader();let bytes=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw Object.assign(Error('Source size budget exceeded'),{retryable:false});}chunks.push(value);}
   const all=new Uint8Array(bytes);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}
   let raw;try{raw=JSON.parse(new TextDecoder().decode(all));}catch{throw Object.assign(Error('Invalid source JSON'),{retryable:false});}
   return {raw,bytes,retrievedAt:new Date(now()).toISOString(),sha256:await sha256(raw),sourceUrl:url};
  }catch(e){last=e;if(e.retryable===false||attempt===attempts-1)break;await sleep(Math.min(3000,delay));}
 }
 throw last;
}
export async function collectSource(dataset,scope,options={}){
 const evidence=await fetchBoundedJSON(sourceRequest(dataset,scope),options);
 const parsed=parseSource(dataset,evidence.raw,scope,options.now?.()??Date.now());
 return {raw:evidence.raw,sourceHash:evidence.sha256,sourceBytes:evidence.bytes,...parsed,retrievedAt:evidence.retrievedAt};
}
export function sourceHealth(snapshot,now=Date.now()){
 if(!snapshot?.retrievedAt)return {status:'unavailable',latestPeriodEnd:null};
 const ends=snapshot.records?.map(r=>r.periodEnd).filter(Boolean).sort()||[];const end=ends.at(-1)||null;
 const observationState=snapshot.dataset==='BMUNITS'?freshness(snapshot.retrievedAt,now,{delayMinutes:1440,staleMinutes:4320}):freshness(end,now);
 return {observationState,status:snapshot.error?'retained':snapshot.dataset==='BMUNITS'?freshness(snapshot.retrievedAt,now,{delayMinutes:1440,staleMinutes:4320}):freshness(end,now),latestPeriodEnd:end,coverage:snapshot.coverage,error:snapshot.error||null,checkedAt:snapshot.retrievedAt,lastAttemptAt:snapshot.lastAttemptAt||snapshot.retrievedAt};
}
export function retained(previous,error,attemptedAt=new Date().toISOString()){
 // Preserve successful retrieval and observation timestamps; attempt time is separate.
 return {...(previous||{records:[],coverage:'unknown',retrievedAt:null}),error:String(error?.message||error).slice(0,200),lastAttemptAt:instant(attemptedAt)};
}

export function preventRegression(previous,incoming){
 if(!previous?.records?.length||['BOALF','BMUNITS'].includes(incoming.dataset))return incoming;
 const byKey=new Map(incoming.records.map(r=>[r.key,r]));
 for(const old of previous.records){const row=byKey.get(old.key);
  if(!row){
   // Full BOAV snapshots can remove actions only in a strictly newer run.
   const oldRun=previous.records.map(r=>r.sourcePublishedAt||'').sort().at(-1);
   const newRun=incoming.records.map(r=>r.sourcePublishedAt||'').sort().at(-1);
   if(incoming.dataset.startsWith('BOAV')&&newRun>oldRun)continue;
   throw Error('Source coverage regressed');
  }
  if(String(row.sourcePublishedAt||'')<String(old.sourcePublishedAt||''))throw Error('Source revision regressed');
  if(row.sourcePublishedAt===old.sourcePublishedAt&&stable(row)!==stable(old))throw Error('Conflicting source revision');
 }
 return incoming;
}
