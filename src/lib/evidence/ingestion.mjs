// Shared source normalization. Fetch time is never observation time.
export const NATIONAL_KEY='public-grid-v1';
export const ENERGY_KEY='public-energy-v1';
export function compactRows(code,records,now=Date.now()) {
 if(!Array.isArray(records))throw Error('Invalid source array');
 const valid=records.filter(r=>Number.isFinite(Date.parse(r.startTime))&&Date.parse(r.startTime)<=now&&Number.isFinite(Date.parse(r.publishTime))&&Date.parse(r.publishTime)<=now&&typeof (code==='INDO'?r.demand:r.generation)==='number'&&Number.isFinite(code==='INDO'?r.demand:r.generation));
 if(!valid.length)throw Error('No valid observations');
 return valid.map(r=>({startTime:r.startTime,publishTime:r.publishTime,...(code==='INDO'?{demand:r.demand}:{fuelType:r.fuelType,generation:r.generation})}));
}
export function retainedSource(previous,error,attemptedAt) {return {...(previous||{records:[],checkedAt:null}),error:String(error),lastAttemptAt:attemptedAt};}
export function sourceStatus(timestamp,cadenceMinutes,now=Date.now()) {
 const t=Date.parse(timestamp);return !Number.isFinite(t)||t>now?'unavailable':now-t>cadenceMinutes*120000?'delayed':'live';
}
export function truthfulFreshness(payload,now=Date.now()) {
 const sourceFreshness=Object.fromEntries(Object.entries(payload.dataFreshness?.sourceFreshness||{}).map(([k,v])=>[k,{...v,status:['retained','unavailable'].includes(v.status)?v.status:sourceStatus(v.timestamp,v.cadenceMinutes||30,now)}]));
 return {...payload,dataFreshness:{...payload.dataFreshness,sourceFreshness,isRealtime:sourceFreshness.generation?.status==='live',status:sourceFreshness.generation?.status||'unavailable'}};
}
