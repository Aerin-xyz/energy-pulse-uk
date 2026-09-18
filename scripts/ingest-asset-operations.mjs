import fs from 'node:fs/promises';
import {cachedJSON,atomicJSON} from './evidence/cache.mjs';
import {settlementCoordinates,settlementStart} from '../supabase/functions/_shared/settlementTime.mjs';
const target='public/data/asset-operations.json';
try{
 const assets=JSON.parse(await fs.readFile('src/data/atlas/canonical-assets.json','utf8'));const verified=JSON.parse(await fs.readFile('public/data/asset-verification.json','utf8'));
 if(verified.error||Date.now()-Date.parse(verified.checkedAt)>8*86400000)throw Error('Registry verification unavailable');
 const units=new Set(assets.filter(a=>a.unitMatch.status==='verified'&&verified.results.some(v=>v.id===a.id&&v.status==='verified')).flatMap(a=>a.units));
 const {date,period}=settlementCoordinates(new Date().toISOString());const from=settlementStart(date,period),to=new Date(Date.parse(from)+1800000).toISOString();
 const url=`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${date}&settlementPeriod=${period}&format=json`;const result=await cachedJSON(url,300000);if(!Array.isArray(result.value.data))throw Error('PN contract unavailable');
 const records=result.value.data.filter(r=>r.dataset==='PN'&&units.has(r.bmUnit));if(!records.length)throw Error('No reviewed unit notifications');
 await atomicJSON(target,{schemaVersion:1,kind:'scheduled',unit:'MW',from,to,source:'Elexon physical notifications (PN)',url,attribution:'Contains BMRS data © Elexon Limited copyright and database right 2026.',checkedAt:result.checkedAt,publishedAt:null,publicationNote:'Row publication time unavailable; content revisions retained.',revision:result.revision,records});console.log(`Asset operations: ${records.length} PN segments, ${from}. Scheduled, not measured.`);
}catch(e){let old={records:[]};try{old=JSON.parse(await fs.readFile(target,'utf8'))}catch{}await atomicJSON(target,{...old,error:e.message,lastAttemptAt:new Date().toISOString()});console.warn(e.message);process.exitCode=1}
