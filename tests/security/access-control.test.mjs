import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {authorizeIngestion} from '../../supabase/functions/_shared/ingestion-auth.mjs';
const testToken='test-only-scheduler-credential-not-a-real-secret';
for (const [name,header,expected,status] of [
 ['missing header',null,testToken,401],['wrong token','Bearer wrong',testToken,401],
 ['public key','Bearer public-anonymous-test-key',testToken,401],
 ['missing configuration','Bearer '+testToken,undefined,503],
 ['short configuration','Bearer short','short',503],
 ['valid scheduler','Bearer '+testToken,testToken,null],
]) test(name,async()=>{
 const r=new Request('https://example.invalid',{headers:header?{Authorization:header}:{}});
 const denied=await authorizeIngestion(r,expected);assert.equal(denied?.status??null,status);
});
const names=['assembler-agent','collector-agent','linkedin-ingest','publisher-agent','scorer-agent','snapshot-agent','summariser-agent','test-mailerlite','approve-social-post','check-linkedin-config','create-test-posts','generate-daily-summary-card'];
for(const name of names)test(name+' cannot perform provider or database work',async()=>{
 let handler;const code=readFileSync(new URL('../../supabase/functions/'+name+'/index.ts',import.meta.url),'utf8').replace('req: Request','req');
 vm.runInNewContext(code,{Deno:{serve(fn){handler=fn}},Response,JSON});
 for(const method of ['GET','POST','PUT','DELETE']){
   const response=await handler(new Request('https://example.invalid',{method,headers:{Authorization:'Bearer public-test-key'}}));
   assert.equal(response.status,403);
 }
 assert.equal((await handler(new Request('https://example.invalid',{method:'OPTIONS'}))).status,204);
});
test('ingestion guard precedes creation of privileged client',()=>{
 const s=readFileSync(new URL('../../supabase/functions/cache-warmup/index.ts',import.meta.url),'utf8');
 assert.ok(s.indexOf('if(denied)return denied;')<s.indexOf('const db=createClient'));
});
