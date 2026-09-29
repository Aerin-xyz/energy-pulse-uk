import {expectedPeriods,settlementStart} from '../../../supabase/functions/_shared/settlementTime.mjs';
export const FUELS=['BIOMASS','CCGT','COAL','NPSHYD','NUCLEAR','OCGT','OIL','OTHER','PS','WIND'];
export const nextDate=date=>new Date(Date.parse(date+'T12:00Z')+86400000).toISOString().slice(0,10);
export function dayBounds(date,basis='UTC'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['UTC','Europe/London'].includes(basis))throw Error('Invalid day/basis');
 const from=basis==='UTC'?date+'T00:00:00Z':settlementStart(date),to=basis==='UTC'?nextDate(date)+'T00:00:00Z':settlementStart(nextDate(date));
 return {from,to,count:(Date.parse(to)-Date.parse(from))/1800000,basis};
}
const num=v=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
export function elexonDay(records,bounds){
 const chosen=new Map();let revisions=0,duplicates=0;const errors=[];
 for(const r of records){const at=Date.parse(r.startTime);if(at<Date.parse(bounds.from)||at>=Date.parse(bounds.to)||!FUELS.includes(r.fuelType))continue;
  if(!Number.isFinite(at)||(at-Date.parse(bounds.from))%1800000!==0){errors.push('Off-grid observation');continue;}
  const key=at+'|'+r.fuelType,value=num(r.generation),pub=Date.parse(r.publishTime);
  if(value===null||(value<0&&r.fuelType!=='PS')||!Number.isFinite(pub)){errors.push('Invalid value/publication '+key);continue;}
  const old=chosen.get(key);if(old){if(pub===old.pub){duplicates++;if(value!==old.value)errors.push('Conflicting same-revision values '+key);}else revisions++;}
  if(!old||pub>old.pub)chosen.set(key,{value,pub});
 }
 const periods=[];for(let i=0;i<bounds.count;i++){const at=Date.parse(bounds.from)+i*1800000,values={};for(const fuel of FUELS){const r=chosen.get(at+'|'+fuel);if(!r)errors.push('Missing '+new Date(at).toISOString()+' '+fuel);else values[fuel]=r.value;}periods.push({from:new Date(at).toISOString(),values});}
 return {periods,errors,revisions,duplicates};
}
export function nesoDay(records,bounds){
 const map=new Map(),errors=[];
 for(const r of records){const raw=r.DATETIME;const at=Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(raw)?raw:raw+'Z');if(at<Date.parse(bounds.from)||at>=Date.parse(bounds.to))continue;
 if(!Number.isFinite(at)||(at-Date.parse(bounds.from))%1800000!==0){errors.push('Invalid NESO timestamp');continue;}
 if(map.has(at))errors.push('Duplicate NESO interval '+raw);map.set(at,r);}
 const periods=[];for(let i=0;i<bounds.count;i++){const at=Date.parse(bounds.from)+i*1800000,r=map.get(at);if(!r){errors.push('Missing NESO interval '+new Date(at).toISOString());continue;}
 const values={};for(const k of ['GAS','WIND','NUCLEAR','BIOMASS','HYDRO','SOLAR']){values[k]=num(r[k]);if(values[k]===null||values[k]<0)errors.push('Invalid NESO '+k);}
 periods.push({from:new Date(at).toISOString(),values});}return {periods,errors};
}
export function validateDay(row,elexon,neso){
 const bounds=dayBounds(row.settlementDate,row.timeBasis||'UTC'),e=elexonDay(elexon,bounds),n=nesoDay(neso,bounds),checks=[];
 const add=(id,pass,detail)=>checks.push({id,status:pass?'pass':'fail',detail});
 add('elexon.coverage',!e.errors.length,{expected:bounds.count,errors:e.errors,revisions:e.revisions,duplicates:e.duplicates});
 add('neso.coverage',!n.errors.length,{expected:bounds.count,errors:n.errors});
 add('report.period-count',row.totalPeriods===bounds.count,{actual:row.totalPeriods,expected:bounds.count});
 if(e.errors.length||n.errors.length)return {date:row.settlementDate,bounds,checks,status:'failed'};
 const mappings={Gas:['CCGT','OCGT'],Wind:['WIND'],Nuclear:['NUCLEAR'],Biomass:['BIOMASS'],Hydro:['NPSHYD'],Coal:['COAL']};
 const daily={};for(const [name,fuels]of Object.entries(mappings))daily[name]=e.periods.reduce((s,p)=>s+fuels.reduce((a,f)=>a+p.values[f],0)*.5,0);
 daily.Other=e.periods.reduce((s,p)=>s+(p.values.OTHER+p.values.OIL)*.5,0);daily.Solar=n.periods.reduce((s,p)=>s+p.values.SOLAR*.5,0);
 const storageMWh=e.periods.reduce((s,p)=>s+p.values.PS*.5,0);
 for(const [name,expectedMWh]of Object.entries(daily)){const actual=num(row.fuelMix?.find(f=>f.fuelType===name)?.mw);const toleranceMWh=name==='Solar'?Math.max(12,expectedMWh*.02):Math.max(1,Math.abs(expectedMWh)*.001);add('report.fuel.'+name,actual!==null&&Math.abs(actual-expectedMWh)<=toleranceMWh,{actualMWh:actual,expectedMWh,toleranceMWh});}
 for(const [fuel,keys]of Object.entries({GAS:['CCGT','OCGT'],WIND:['WIND'],NUCLEAR:['NUCLEAR'],BIOMASS:['BIOMASS'],HYDRO:['NPSHYD']})){
 const mismatches=[];e.periods.forEach((p,i)=>{const a=keys.reduce((s,k)=>s+p.values[k],0),b=n.periods[i].values[fuel];if(Math.abs(a-b)>Math.max(1,Math.abs(a)*.001))mismatches.push({from:p.from,elexonMW:a,nesoMW:b});});add('cross-source.'+fuel,mismatches.length===0,{compared:bounds.count,mismatches});}
 const totalMWh=Object.values(daily).reduce((a,b)=>a+b,0),reportSum=(row.fuelMix||[]).reduce((s,f)=>s+(num(f.mw)??NaN),0);
 add('report.sum',Number.isFinite(reportSum)&&Math.abs(reportSum-row.totalMW)<1,{fuelSumMWh:reportSum,reportedMWh:row.totalMW});
 add('report.total',Number.isFinite(row.totalMW)&&Math.abs(row.totalMW-totalMWh)<=Math.max(12,totalMWh*.002),{actualMWh:row.totalMW,expectedMWh:totalMWh});
 const renewableMWh=daily.Wind+daily.Solar+daily.Hydro;
 return {date:row.settlementDate,bounds,checks,status:checks.some(c=>c.status==='fail')?'failed':'passed',recalculated:{fuelMWh:daily,totalMWh,renewableMWh,renewableShare:100*renewableMWh/totalMWh,averageMW:totalMWh/(bounds.count/2),signedStorageMWh:storageMWh}};
}
export function summarizeDays(days){
 const complete=days.filter(d=>d.recalculated),hours=complete.reduce((s,d)=>s+d.bounds.count/2,0),energy=complete.reduce((s,d)=>s+d.recalculated.totalMWh,0),renewable=complete.reduce((s,d)=>s+d.recalculated.renewableMWh,0);
 return {days:days.length,hours,energyMWh:energy,averageMW:hours?energy/hours:null,renewableShare:energy?renewable/energy*100:null,definition:'Transmission-metered generation plus NESO solar estimates; excludes imports, embedded wind and pumped storage. Renewable numerator: wind, solar and natural hydro; biomass excluded.',status:days.some(d=>d.status==='failed')?'failed':days.length===7?'passed':'warning'};
}

export function carbonDay(records,bounds){
 const entries=new Map(),errors=[];
 for(const r of records){const from=Date.parse(r.from),to=Date.parse(r.to);if(from<Date.parse(bounds.from)||from>=Date.parse(bounds.to))continue;
 if(!Number.isFinite(from)||to-from!==1800000||(from-Date.parse(bounds.from))%1800000!==0){errors.push('Invalid carbon interval');continue;}
 if(entries.has(from))errors.push('Duplicate carbon interval');entries.set(from,r.intensity?.actual);
 }
 const actual=[];for(let i=0;i<bounds.count;i++){const v=entries.get(Date.parse(bounds.from)+i*1800000);if(typeof v!=='number'||!Number.isFinite(v)||v<0)errors.push('Missing actual carbon interval '+i);else actual.push(v);}
 return {status:errors.length?'unavailable':'passed',actualPeriods:actual.length,expectedPeriods:bounds.count,meanActualGCO2PerKWh:errors.length?null:actual.reduce((a,b)=>a+b,0)/actual.length,aggregation:'Time-average of reported half-hour actual intensity; not consumption-weighted',errors};
}
