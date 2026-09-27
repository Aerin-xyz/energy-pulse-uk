import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['functions/lib/shared-cache.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {edgeJSON}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('shared slots bound cache keys, reuse origin reads, and prevent browser TTL stacking',async()=>{
 const realNow=Date.now;let now=100000;Date.now=()=>now;
 const entries=new Map();globalThis.caches={default:{match:async r=>entries.get(r.url)?.clone(),put:async(r,v)=>{entries.set(r.url,v)}}};
 let reads=0;const pending=[];
 const context=(query='',headers={})=>({request:new Request('https://example.org/api/grid-evidence'+query,{headers}),waitUntil:p=>pending.push(p)});
 try{
  const first=await edgeJSON(context('?v=attacker'), 'test',300,async()=>({reading:++reads}),true);await Promise.all(pending);
  assert.equal(first.headers.get('cache-control'),'public, max-age=0, must-revalidate');
  assert.equal(entries.size,1);assert.equal([...entries.keys()][0],'https://example.org/api/_cache/test/0');
  now=200000;const second=await edgeJSON(context('?v=different'),'test',300,async()=>({reading:++reads}),true);
  assert.equal(reads,1);assert.deepEqual(await second.json(),{reading:1});
  const conditional=await edgeJSON(context('',{'If-None-Match':first.headers.get('etag')}),'test',300,async()=>({reading:++reads}),true);assert.equal(conditional.status,304);
  now=390000;const third=await edgeJSON(context(),'test',300,async()=>({reading:++reads}),true);assert.deepEqual(await third.json(),{reading:2});assert.equal(reads,2);
 }finally{Date.now=realNow;delete globalThis.caches}
});
