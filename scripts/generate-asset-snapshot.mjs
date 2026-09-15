import fs from 'node:fs';
import {assetReading} from '../src/lib/assetReadings.mjs';
import {expectedPeriods,settlementStart,settlementCoordinates} from '../supabase/functions/_shared/settlementTime.mjs';
const assets=JSON.parse(fs.readFileSync('src/data/atlas/generation-assets.json','utf8'));
const target='public/data/generation-assets.json';
const units=new Set(assets.flatMap(a=>a.units));
async function get(date,period){
 const url=`https://data.elexon.co.uk/bmrs/api/v1/datasets/B1610?settlementDate=${date}&settlementPeriod=${period}&format=json`;
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`B1610 HTTP ${r.status}`);
 const j=await r.json();if(!Array.isArray(j.data))throw Error('Invalid B1610 schema');
 return j.data.filter(r=>units.has(r.bmUnit));
}
try {
 const today=settlementCoordinates(new Date().toISOString()).date;
 let date,period,rows=[];
 for(let days=1;days<=14;days++){
  date=new Date(Date.parse(today+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);period=expectedPeriods(date);
  rows=await get(date,period);if(rows.length)break;
 }
 if(!rows.length)throw Error('No metered snapshot published within 14 days');
 const points=[];
 for(let p=period-11;p<=period;p++){
  const data=p===period?rows:await get(date,p);
  points.push({from:settlementStart(date,p),to:new Date(Date.parse(settlementStart(date,p))+1800000).toISOString(),values:Object.fromEntries(assets.map(a=>[a.id,assetReading(data,a.units,date,p)]))});
 }
 fs.mkdirSync('public/data',{recursive:true});fs.writeFileSync(target,JSON.stringify({checkedAt:new Date().toISOString(),settlementDate:date,settlementPeriod:period,source:'Elexon B1610',points},null,2)+'\n');
 console.log(`Generation: ${assets.length} sites, metered history ${date}, ${points.length} half-hours. Not live telemetry.`);
}catch(e){console.warn(`Generation snapshot unavailable: ${e.message}. Existing dated snapshot retained, if present.`);if(!fs.existsSync(target))fs.writeFileSync(target,JSON.stringify({checkedAt:null,points:[]}));}
