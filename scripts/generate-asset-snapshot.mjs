import fs from 'node:fs';
import {digest,cachedJSON} from './evidence/cache.mjs';
import {assetReading} from '../src/lib/assetReadings.mjs';
import {expectedPeriods,settlementStart,settlementCoordinates} from '../supabase/functions/_shared/settlementTime.mjs';
const assets=JSON.parse(fs.readFileSync('src/data/atlas/canonical-assets.json','utf8'));
const target='public/data/generation-assets.json';
let verification={results:[],error:'Verification unavailable'};try{verification=JSON.parse(fs.readFileSync('public/data/asset-verification.json','utf8'))}catch{}
const allowed=a=>a.unitMatch.status==='verified'&&!verification.error&&verification.results.some(r=>r.id===a.id&&r.status==='verified');
const units=new Set(assets.flatMap(a=>a.units));
async function get(date,period){
 const url=`https://data.elexon.co.uk/bmrs/api/v1/datasets/B1610?settlementDate=${date}&settlementPeriod=${period}&format=json`;
 const fetched=await cachedJSON(url,86400000); const j=fetched.value;if(!Array.isArray(j.data))throw Error('Invalid B1610 schema');
 return j.data.filter(r=>units.has(r.bmUnit));
}
try {
 if(verification.error||!verification.checkedAt||Date.now()-Date.parse(verification.checkedAt)>8*86400000)throw Error(verification.error||'Asset verification is missing or expired');
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
  points.push({from:settlementStart(date,p),to:new Date(Date.parse(settlementStart(date,p))+1800000).toISOString(),values:Object.fromEntries(assets.map(a=>[a.id,{...assetReading(data,allowed(a)?a.units:[],date,p),matchStatus:a.unitMatch.status,kind:'measured',unit:'MW',revision:digest(JSON.stringify(data.filter(r=>a.units.includes(r.bmUnit)))),settlementRuns:[...new Set(data.filter(r=>a.units.includes(r.bmUnit)).map(r=>r.settlementRunType))],publishedAt:null}]))});
 }
 fs.mkdirSync('public/data',{recursive:true});fs.writeFileSync(target,JSON.stringify({checkedAt:new Date().toISOString(),settlementDate:date,settlementPeriod:period,source:'Elexon B1610',canonicalVersion:'gb-assets-v1',verificationCheckedAt:verification.checkedAt||null,verificationError:verification.error||null,publicationNote:'Provider row publication time unavailable; settlement run and content revision retained',points},null,2)+'\n');
 console.log(`Generation: ${assets.length} sites, metered history ${date}, ${points.length} half-hours. Not live telemetry.`);
}catch(e){console.warn(`Generation snapshot unavailable: ${e.message}. Existing dated snapshot retained, if present.`);const retained=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{checkedAt:null,points:[]};fs.writeFileSync(target,JSON.stringify({...retained,refreshError:e.message,lastAttemptAt:new Date().toISOString()},null,2)+'\n');}
