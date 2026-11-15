import {collectSource,sourceHealth,preventRegression} from './transport.mjs';
import {reconcileVolumes,mapUnits} from './adapters.mjs';
import {settlementCoordinates} from '../../../supabase/functions/_shared/settlementTime.mjs';
import {requireDate,expectedPeriods,sha256} from './contracts.mjs';
export function nextDue(now,cadenceSeconds=1800){const cycle=cadenceSeconds*1000,phase=cadenceSeconds===1800?21*60000-5000:0;return new Date((Math.floor((now-phase)/cycle)+1)*cycle+phase).toISOString();}
export function retryDue(now,after){const until=typeof after==='string'&&/^\d+$/.test(after)?now+Number(after)*1000:Date.parse(after);return new Date(Math.max(now+900000,Number.isFinite(until)?until:0)).toISOString();}
export const scopeKey=(dataset,scope)=>dataset+'|'+(scope.date||'reference')+(scope.period?'/'+scope.period:'');
export function runPlan(now){const date=settlementCoordinates(new Date(now).toISOString()).date;const previous=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);return {date,previous};}
// Store is injected: identical adapters run offline and in the authenticated Edge Function.
/** @param {{store: any, now?: number, collect?: typeof collectSource, mappings?: Array<any>}} options */
export async function runOperations({store,now=Date.now(),collect=collectSource,mappings=[]}){
 const started=Date.now(),outcomes=[],plan=runPlan(now);
 async function get(dataset,scope,cadenceSeconds=1800){
  const key=scopeKey(dataset,scope),prior=await store.get(key);
  if(prior&&Date.parse(prior.nextAttemptAt)>now){outcomes.push({key,result:'not-due'});return prior.snapshot;}
  if(Date.now()-started>80000){outcomes.push({key,result:'deferred-budget'});return prior?.snapshot||null;}
  try{
   const value=preventRegression(prior?.snapshot,await collect(dataset,scope,{now:()=>now+Date.now()-started,attempts:2}));
   if(dataset==='BMUNITS'){value.records=mapUnits(value.records,mappings);value.mappingVersion=await sha256(mappings);}
   await store.put(key,value,nextDue(now+Date.now()-started,cadenceSeconds));outcomes.push({key,result:'ok',records:value.records.length,bytes:value.sourceBytes});return value;
  }catch(error){await store.fail(key,dataset,scope,String(error.message||error).slice(0,200),retryDue(now,error.retryAfter));outcomes.push({key,result:'failed',error:String(error.message||error).slice(0,200)});return prior?.snapshot?{...prior.snapshot,error:String(error.message||error)}:null;}
 }
 const prices=[];for(const date of [plan.date,plan.previous]){const s=await get('DISEBSP',{date});if(s)prices.push(s);}
 const latest=prices.flatMap(s=>s.records).filter(r=>r.periodEnd<=new Date(now).toISOString()).sort((a,b)=>a.periodStart.localeCompare(b.periodStart)).at(-1);
 const volumes=[],instructions=[];
 if(latest){
  const scopes=[{date:latest.settlementDate,period:latest.settlementPeriod}];
  // Revisit a corresponding previous-day period, never promise a full historical action archive.
  const period=Math.min(latest.settlementPeriod,expectedPeriods(plan.previous));
  if(latest.settlementDate!==plan.previous)scopes.push({date:plan.previous,period});
  for(const scope of scopes){const bids=await get('BOAV-bid',scope),offers=await get('BOAV-offer',scope);const price=prices.flatMap(s=>s.records).find(r=>r.settlementDate===scope.date&&r.settlementPeriod===scope.period);
   volumes.push({scope,bids,offers,reconciliation:price&&bids&&offers?reconcileVolumes(price,bids.records,offers.records):{status:'unavailable'}});
  }
  const instruction=await get('BOALF',{date:latest.settlementDate,period:latest.settlementPeriod});if(instruction)instructions.push(instruction);
 }
 const reference=await get('BMUNITS',{},86400);
 const clean=s=>{if(!s)return null;const {raw,...rest}=s;return {...rest,health:sourceHealth(s,now)};};
 const snapshot={schemaVersion:1,definitionVersion:'gb-operations-v1',generatedAt:new Date(now).toISOString(),prices:prices.map(clean),acceptedVolumes:volumes.map(v=>({...v,bids:clean(v.bids),offers:clean(v.offers)})),instructions:instructions.map(clean),referenceHealth:reference?sourceHealth(reference,now):{status:'unavailable'},limitations:['Latest published settlement data; not instantaneous balance or final billing.','BOALF power instructions are not actual output.','Unknown or uncollected periods are not zero actions.','Accepted volumes are not curtailment or a total balancing cost.']};
 return {snapshot,outcomes,status:outcomes.some(x=>x.result==='failed'||x.result==='deferred-budget')||!latest||!reference||prices.some(s=>s.error)||volumes.some(v=>v.reconciliation.status!=='matched'||v.bids?.error||v.offers?.error)?'partial':'succeeded'};
}
