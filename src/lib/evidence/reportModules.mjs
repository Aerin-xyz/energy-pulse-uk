import {dayBounds,elexonDay,carbonDay,FUELS,nextDate} from './reportValidation.mjs';
import {expectedPeriods,settlementStart} from '../../../supabase/functions/_shared/settlementTime.mjs';
export const VERSION='authoritative-report-v3';
export const BASIS='Elexon transmission-metered generation; excludes imports, embedded estimates and pumped storage. Renewable share is wind plus natural hydro, excluding biomass.';
const numeric=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));
export function meteredModule(records,bounds){
 if(!Array.isArray(records))return {status:'unavailable',errors:['Invalid Elexon response'],totalMWh:null};
 const parsed=elexonDay(records,bounds);
 // Do not accept blank values through JavaScript numeric coercion or new fuel categories silently.
 const excluded=/^INT/;
 for(const r of records){const t=Date.parse(r.startTime);if(t<Date.parse(bounds.from)||t>=Date.parse(bounds.to))continue;
  if(!Number.isFinite(t)||(!FUELS.includes(r.fuelType)&&!excluded.test(r.fuelType)))parsed.errors.push('Unknown fuel or observation timestamp');
  if(FUELS.includes(r.fuelType)&&!numeric(r.generation))parsed.errors.push('Invalid numeric generation');
 }
 if(parsed.errors.length)return {status:'unavailable',errors:parsed.errors,totalMWh:null,expectedPeriods:bounds.count};
 const fuelMWh=Object.fromEntries(FUELS.map(f=>[f,parsed.periods.reduce((s,p)=>s+p.values[f]*0.5,0)]));
 const totalMWh=Object.entries(fuelMWh).filter(([f])=>f!=='PS').reduce((s,[,v])=>s+v,0);
 return {status:'passed',kind:'measured',publicationStatus:'revisable',unit:'MWh',expectedPeriods:bounds.count,observedPeriods:parsed.periods.length,fuelMWh,totalMWh,averageMW:totalMWh/(bounds.count/2),renewableShare:totalMWh>0?100*(fuelMWh.WIND+fuelMWh.NPSHYD)/totalMWh:null,signedStorageMWh:fuelMWh.PS,revisions:parsed.revisions,duplicates:parsed.duplicates,sourcePublishedAt:new Date(Math.max(...records.filter(r=>FUELS.includes(r.fuelType)&&Date.parse(r.startTime)>=Date.parse(bounds.from)&&Date.parse(r.startTime)<Date.parse(bounds.to)).map(r=>Date.parse(r.publishTime)))).toISOString(),errors:[]};
}
export function estimateModule(records,date,field){
 const count=expectedPeriods(date),errors=[],periods=new Map();
 if(!Array.isArray(records))return {status:'unavailable',kind:'estimated',totalMWh:null,errors:['Invalid NESO response']};
 for(const r of records){if(r.SETTLEMENT_DATE!==date||r.FORECAST_ACTUAL_INDICATOR!=='A')continue;
  const p=Number(r.SETTLEMENT_PERIOD);if(!Number.isInteger(p)||p<1||p>count||!numeric(r[field])||Number(r[field])<0){errors.push('Invalid period/value');continue;}
  if(periods.has(p))errors.push('Duplicate interval '+p);periods.set(p,Number(r[field]));
 }
 for(let p=1;p<=count;p++)if(!periods.has(p))errors.push('Missing interval '+p);
 return {status:errors.length?'unavailable':'passed',kind:'estimated',unit:'MWh',sourceField:field,sourcePublishedAt:null,expectedPeriods:count,observedPeriods:periods.size,totalMWh:errors.length?null:[...periods.values()].reduce((a,b)=>a+b,0)*.5,averageMW:errors.length?null:[...periods.values()].reduce((a,b)=>a+b,0)/count,from:settlementStart(date),to:settlementStart(nextDate(date)),errors};
}
export function validateModules(date,{elexon,neso,carbon,errors={}}){
 const bounds=dayBounds(date,'Europe/London');
 const module=(name,fn)=>errors[name]?{status:'unavailable',errors:[errors[name]],totalMWh:null}:fn();
 const metered=module('elexon',()=>meteredModule(elexon,bounds));
 const solar=module('neso',()=>estimateModule(neso,date,'EMBEDDED_SOLAR_GENERATION'));
 const embeddedWind=module('neso',()=>estimateModule(neso,date,'EMBEDDED_WIND_GENERATION'));
 const carbonResult=module('carbon',()=>Array.isArray(carbon)?carbonDay(carbon,bounds):{status:'unavailable',errors:['Invalid carbon response']});
 return {date,bounds,status:metered.status==='passed'?'passed':'failed',modules:{metered,solar,embeddedWind,carbon:carbonResult}};
}
export function aggregateModules(days){
 const names=['metered','solar','embeddedWind','carbon'];const out={};
 for(const name of names){const good=days.filter(d=>d.modules[name].status==='passed');out[name]={status:good.length===days.length?'passed':'unavailable',completeDays:good.length,expectedDays:days.length};
  if(good.length!==days.length)continue;
  const hours=days.reduce((s,d)=>s+d.bounds.count/2,0);
  if(name==='carbon'){out[name].meanActualGCO2PerKWh=days.reduce((s,d)=>s+d.modules.carbon.meanActualGCO2PerKWh*d.bounds.count/2,0)/hours;continue;}
  out[name].totalMWh=days.reduce((s,d)=>s+d.modules[name].totalMWh,0);out[name].averageMW=out[name].totalMWh/hours;
  if(name==='metered'){out[name].renewableShare=out[name].totalMWh>0?100*days.reduce((s,d)=>s+d.modules.metered.fuelMWh.WIND+d.modules.metered.fuelMWh.NPSHYD,0)/out[name].totalMWh:null;out[name].signedStorageMWh=days.reduce((s,d)=>s+d.modules.metered.signedStorageMWh,0);}
 }
 return out;
}
