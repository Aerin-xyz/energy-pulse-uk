import {finite,sourceState} from '../gridMetrics.mjs';
export const VERSION='gb-evidence-v1';
export const numberOrNull=v=> typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()!==''&&/^-?\d+(\.\d+)?$/.test(v.trim())?Number(v):null;
export function londonTime(raw){
 if(typeof raw!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw))return null;
 const t=Date.parse(raw+'Z');if(!Number.isFinite(t))return null;
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const candidates=[t,t-3600000].filter(x=>format.format(x).replace(' ','T')===raw);
 return candidates.length===1?new Date(candidates[0]).toISOString():null;
}
export function normalizeBoundaries(records){
 const groups=new Map();
 for(const r of records){const raw=r['Date_ Time GMT_BST'], boundary=r['Constraint Group'];if(typeof boundary!=='string')continue;
 const row={boundary,rawTime:raw,from:londonTime(raw),flowMW:numberOrNull(r.Flow_MW),limitMW:numberOrNull(r.Limit_MW),kind:'forecast',unit:'MW'};
 const key=boundary+'|'+raw,prev=groups.get(key);
 if(prev&&(prev.flowMW!==row.flowMW||prev.limitMW!==row.limitMW)){row.flowMW=null;row.limitMW=null;row.conflict=true}
 if(prev?.conflict){row.flowMW=null;row.limitMW=null;row.conflict=true}
 groups.set(key,row);
 }
 return [...groups.values()].sort((a,b)=>String(a.from).localeCompare(String(b.from))||a.boundary.localeCompare(b.boundary));
}
export function boundarySummary(rows,now=Date.now()){
 const future=rows.filter(r=>r.from&&Date.parse(r.from)>=now&&Date.parse(r.from)<=now+48*3600000);
 const groups=[...new Set(future.map(r=>r.boundary))];
 return groups.map(boundary=>{const data=future.filter(r=>r.boundary===boundary);const known=data.filter(r=>finite(r.flowMW)&&finite(r.limitMW)&&r.limitMW>0);const tightest=known.sort((a,b)=>(a.limitMW-a.flowMW)-(b.limitMW-b.flowMW))[0];return {boundary,periods:data.length,known:known.length,tightest:tightest||null,gapMW:tightest?tightest.limitMW-tightest.flowMW:null}});
}
export const INTERCONNECTORS=['INTFR','INTIFA2','INTELEC','INTNED','INTNEM','INTNSL','INTVKL','INTEW','INTIRL','INTGRNL'];
export const DOMESTIC=['BIOMASS','CCGT','COAL','NPSHYD','NUCLEAR','OCGT','OIL','OTHER','WIND'];
export function revisedRows(records,now=Date.now()){
 const map=new Map();for(const r of records){const start=Date.parse(r.startTime),pub=Date.parse(r.publishTime);if(!Number.isFinite(start)||!Number.isFinite(pub)||pub>now||start+1800000>now)continue;const key=r.startTime+'|'+(r.fuelType||'demand');const old=map.get(key);if(!old||Date.parse(old.publishTime)<pub)map.set(key,r);else if(Date.parse(old.publishTime)===pub&&(old.generation!==r.generation||old.demand!==r.demand))map.set(key,{...r,generation:null,demand:null});}return [...map.values()];
}
function total(rows,codes){const values=codes.map(c=>rows.find(r=>r.fuelType===c)?.generation);return values.every(finite)?values.reduce((a,b)=>a+b,0):null}
export function halfHours(fuels,demand,now=Date.now()){
 const fs=revisedRows(fuels,now),ds=revisedRows(demand,now);return [...new Set(fs.map(r=>r.startTime))].sort().map(from=>{const rows=fs.filter(r=>r.startTime===from);const get=code=>{const v=rows.find(r=>r.fuelType===code)?.generation;return finite(v)?v:null};const d=ds.find(r=>r.startTime===from);return {from,to:new Date(Date.parse(from)+1800000).toISOString(),demandMW:finite(d?.demand)?d.demand:null,windMW:get('WIND'),gasMW:get('CCGT'),nuclearMW:get('NUCLEAR'),generationMW:total(rows,DOMESTIC),renewableMW:total(rows,["WIND","NPSHYD","BIOMASS"]),generationMix:DOMESTIC.map(code=>({code,name:({WIND:"Wind",NPSHYD:"Hydro",BIOMASS:"Biomass",NUCLEAR:"Nuclear",CCGT:"Gas",OCGT:"OCGT",COAL:"Coal",OIL:"Oil",OTHER:"Other"})[code],value:get(code)})),netImportsMW:total(rows,INTERCONNECTORS),storageMW:get('PS'),publicationTimes:[...new Set([...rows,...(d?[d]:[])].map(r=>r.publishTime))]}});
}
export function changesEvidence(fuels,demand,now=Date.now()){
 const rows=halfHours(fuels,demand,now),after=rows.at(-1),before=rows.at(-2);if(!before||!after||Date.parse(after.from)-Date.parse(before.from)!==1800000)return null;
 const definitions=[['demandMW','Initial national demand'],['generationMW','Transmission-metered generation (excluding storage)'],['windMW','Transmission-metered wind'],['gasMW','CCGT generation'],['netImportsMW','Net interconnector imports'],['storageMW','Pumped-storage signed output']];
 return {before,after,rows:definitions.map(([key,label])=>({key,label,before:before[key],after:after[key],delta:finite(before[key])&&finite(after[key])?after[key]-before[key]:null,unit:'MW',kind:'measured'})),fresh:sourceState(after.to,30,now).fresh};
}
export function sourceHealth(source,now=Date.now()){
 if(!source?.checkedAt)return 'Unavailable';
 if(source.error)return 'Refresh failed · last known data';
 const state=sourceState(source.checkedAt,source.refreshMinutes||60,now);return state.fresh?'Checked recently':state.label;
}
