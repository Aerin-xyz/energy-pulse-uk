import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.117.2';
import {authorizeIngestion} from '../_shared/ingestion-auth.mjs';
import {runOperations} from '../../../src/lib/operations/runner.mjs';
import notificationMappings from '../../../src/data/atlas/notification-mappings.json' with {type:'json'};
Deno.serve(async req=>{
 if(Deno.env.get('GRID_OPERATIONS_ENABLED')!=='true')return Response.json({error:'Operations ingestion disabled'},{status:404});
 if(req.method!=='POST')return Response.json({error:'Scheduled POST only'},{status:405});
 const denied=await authorizeIngestion(req,Deno.env.get('ENERGY_INGESTION_TOKEN'));if(denied)return denied;
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const owner=crypto.randomUUID();const claim=await db.rpc('claim_grid_operations',{run_owner:owner});
 if(claim.error)return Response.json({error:'Operations lease unavailable'},{status:503});if(!claim.data)return Response.json({skipped:'Not due or already running'});
 const ensure=(result:any)=>{if(result.error)throw Error('Operations persistence failed');return result.data;};
 try{
  const budget=ensure(await db.rpc('maintain_grid_operations'));
  const store={
   async get(key:string){const r=ensure(await db.from('grid_operation_snapshots').select('snapshot,error,next_attempt_at').eq('key',key).maybeSingle());return r?{snapshot:r.snapshot?{...r.snapshot,...(r.error?{error:r.error}:{})}:null,nextAttemptAt:r.next_attempt_at}:null;},
   async put(key:string,payload:any,due:string){ensure(await db.rpc('save_grid_operation',{k:key,payload,due}));},
   async fail(key:string,dataset:string,scope:any,error:string,due:string){const old=ensure(await db.from('grid_operation_snapshots').select('key').eq('key',key).maybeSingle());const data={error,next_attempt_at:due,last_attempt_at:new Date().toISOString()};if(old)ensure(await db.from('grid_operation_snapshots').update(data).eq('key',key));else ensure(await db.from('grid_operation_snapshots').insert({key,dataset,scope,...data}));}
  };
  const result=await runOperations({store,mappings:notificationMappings.entries});
  // Publish only a derived read snapshot; raw evidence stays backend-only.
  ensure(await db.from('api_cache').upsert({cache_key:'public-grid-operations-v1',data:result.snapshot,updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()},{onConflict:'cache_key'}));
  ensure(await db.from('energy_ingestion_state').update({status:result.status,completed_at:new Date().toISOString(),lease_until:new Date().toISOString(),details:{outcomes:result.outcomes,budget}}).eq('name','grid-operations').eq('owner',owner));
  return Response.json({status:result.status,outcomes:result.outcomes},{status:result.status==='succeeded'?200:207});
 }catch{
  await db.from('energy_ingestion_state').update({status:'failed',completed_at:new Date().toISOString(),lease_until:new Date().toISOString(),details:{error:'Operations ingestion failed; last public snapshot retained'}}).eq('name','grid-operations').eq('owner',owner);
  return Response.json({error:'Operations ingestion failed; last snapshot retained'},{status:503});
 }
});
