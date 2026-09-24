import mappings from '../../src/data/atlas/notification-mappings.json';
import {settlementCoordinates,settlementStart} from '../../supabase/functions/_shared/settlementTime.mjs';
import {buildNotificationFeed,validateNotificationMappings} from '../../src/lib/notificationFeed.mjs';
export async function onRequestGet(context:any){
 const now=new Date();const {date,period}=settlementCoordinates(now.toISOString());
 const from=settlementStart(date,period),to=new Date(Date.parse(from)+1800000).toISOString();
 const cache=(caches as any).default;
 const key=new Request(new URL(`/api/asset-operations?period=${date}-${period}`,context.request.url));
 const saved=await cache.match(key);if(saved)return saved;
 try{
  const get=async(url:string,ttl:number)=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000),cf:{cacheTtl:ttl,cacheEverything:true}} as any);if(!r.ok)throw Error('Source unavailable');return r.json()};
  const url=`https://data.elexon.co.uk/bmrs/api/v1/datasets/PN?settlementDate=${date}&settlementPeriod=${period}&format=json`;
  const [pn,registry,catalogue]=await Promise.all([get(url,60),get(mappings.registryURL,3600),context.env.ASSETS.fetch(new URL('/data/operational-assets.json',context.request.url)).then((r:Response)=>r.json())]);
  if(!Array.isArray(registry)||!Array.isArray(catalogue.assets))throw Error('Source schema unavailable');
  const verified=validateNotificationMappings(mappings,registry,catalogue.assets);
  const data={...buildNotificationFeed(pn.data,verified,from,to,now.toISOString()),url,mappingReviewedAt:mappings.reviewedAt};
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data.records)));
  const revision=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  // Never cache across a settlement boundary. A minute of caching shares upstream
  // requests between visitors without waiting for a GitHub build/deployment.
  const ttl=Math.max(1,Math.min(60,Math.floor((Date.parse(to)-Date.now())/1000)));
  const response=Response.json({...data,revision},{headers:{'Cache-Control':`public, max-age=${ttl}`}});
  context.waitUntil(cache.put(key,response.clone()));return response;
 }catch{return Response.json({error:'Current notification source unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
