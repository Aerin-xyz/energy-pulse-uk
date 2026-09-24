import fs from 'node:fs/promises';
import {cachedJSON,atomicJSON} from './evidence/cache.mjs';
import {settlementCoordinates,settlementStart} from '../supabase/functions/_shared/settlementTime.mjs';
import {buildNotificationFeed,validateNotificationMappings} from '../src/lib/notificationFeed.mjs';
const target='public/data/asset-operations.json';
try{
 const mappings=JSON.parse(await fs.readFile('src/data/atlas/notification-mappings.json','utf8'));
 const catalogue=JSON.parse(await fs.readFile('public/data/operational-assets.json','utf8'));
 const registry=await cachedJSON(mappings.registryURL,3600000);
 if(!Array.isArray(registry.value))throw Error('Registry contract unavailable');
 const verified=validateNotificationMappings(mappings,registry.value,catalogue.assets);
 const {date,period}=settlementCoordinates(new Date().toISOString());const from=settlementStart(date,period),to=new Date(Date.parse(from)+1800000).toISOString();
 const url=`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${date}&settlementPeriod=${period}&format=json`;const result=await cachedJSON(url,60000);
 const feed=buildNotificationFeed(result.value.data,verified,from,to,result.checkedAt);
 await atomicJSON(target,{...feed,url,revision:result.revision,mappingReviewedAt:mappings.reviewedAt,registryCheckedAt:registry.checkedAt});
 console.log(`${verified.length} sites assessed, ${verified.filter(m=>m.status==='verified').length} registry-validated notification groups; ${feed.records.length} PN segments. Not measured output.`);
}catch(e){let old={records:[]};try{old=JSON.parse(await fs.readFile(target,'utf8'))}catch{}await atomicJSON(target,{...old,error:e.message,lastAttemptAt:new Date().toISOString()});console.warn(e.message);process.exitCode=1}
