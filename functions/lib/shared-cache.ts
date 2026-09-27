import {releaseSlot,releaseTTL} from '../../src/lib/refreshTiming.mjs';
import {SUPABASE_URL,SUPABASE_ANON} from './public-supabase';
export async function snapshot(key:string){
 const url=SUPABASE_URL+'/rest/v1/api_cache?'+new URLSearchParams({cache_key:'eq.'+key,select:'data',limit:'1'});
 const r=await fetch(url,{headers:{apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Shared snapshot unavailable');const rows=await r.json() as any[];
 if(!rows[0]?.data)throw Error('Shared snapshot missing');return rows[0].data;
}
export async function edgeJSON(context:any,key:string,ttl:number,load:()=>Promise<unknown>,aligned=false){
 const now=Date.now();
 const cache=(caches as any).default;const request=new Request(new URL('/api/_cache/'+key+(aligned?'/'+releaseSlot(now):''),context.request.url));
 const conditional=(r:Response)=>context.request.headers.get('If-None-Match')===r.headers.get('ETag')?new Response(null,{status:304,headers:r.headers}):r;
 const deliver=(r:Response)=>{if(!aligned)return conditional(r);const headers=new Headers(r.headers);headers.set('Cache-Control','public, max-age=0, must-revalidate');return conditional(new Response(r.body,{status:r.status,headers}));};
 const hit=await cache.match(request);if(hit)return deliver(hit);
 try {
  const body=JSON.stringify(await load());
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
  const etag='"'+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')+'"';
  const response=new Response(body,{headers:{'Content-Type':'application/json','Cache-Control':`public, max-age=${aligned?releaseTTL(Date.now()):ttl}`,'ETag':etag}});
  context.waitUntil(cache.put(request,response.clone()));return deliver(response);
 }catch{return Response.json({error:'Data temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
