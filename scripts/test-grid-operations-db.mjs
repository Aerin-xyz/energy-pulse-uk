// Isolated PostgreSQL-compatible migration/permission exercise. Never connects to Supabase.
// Usage: node scripts/test-grid-operations-db.mjs /absolute/path/to/pglite/dist/index.js
import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL}from'node:url';
if(!process.argv[2])throw Error('Pass an installed PGlite module path (test tooling only)');
const {PGlite}=await import(pathToFileURL(process.argv[2]).href);const db=new PGlite();let checks=0;
try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE TABLE energy_ingestion_state(name text PRIMARY KEY,owner uuid,started_at timestamptz,completed_at timestamptz,lease_until timestamptz,status text,details jsonb);`);
 await db.exec(fs.readFileSync('supabase/migrations/20261026163000_grid_operations_foundation.sql','utf8'));checks++;
 await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM grid_operation_revisions'),/permission denied/);await assert.rejects(db.query("select claim_grid_operations('00000000-0000-0000-0000-000000000001')"),/permission denied/);checks+=2;await db.exec('RESET ROLE');
 await db.exec('SET ROLE authenticated');await assert.rejects(db.query('SELECT * FROM grid_operation_snapshots'),/permission denied/);checks++;await db.exec('RESET ROLE');
 await db.exec('SET ROLE service_role');let claim=await db.query("select claim_grid_operations('00000000-0000-0000-0000-000000000001') as ok");assert.equal(claim.rows[0].ok,true);claim=await db.query("select claim_grid_operations('00000000-0000-0000-0000-000000000002') as ok");assert.equal(claim.rows[0].ok,false);checks+=2;
 const p=JSON.parse(fs.readFileSync('docs/grid-intelligence/phase1-validation/DISEBSP-2026-10-25.json'));
 const save=async value=>db.query("select save_grid_operation($1,$2::jsonb,now()+interval '30 minutes')",['DISEBSP|2026-10-25',JSON.stringify(value)]);
 await save(p);await save(p);assert.equal((await db.query('select count(*)::int n from grid_operation_revisions')).rows[0].n,1);checks++;
 const revised={...p,sourceHash:'a'.repeat(64),retrievedAt:new Date(Date.parse(p.retrievedAt)+1000).toISOString()};await save(revised);assert.equal((await db.query('select count(*)::int n from grid_operation_revisions')).rows[0].n,2);checks++;
 await save(p);assert.equal((await db.query("select snapshot->>'sourceHash' h from grid_operation_snapshots")).rows[0].h,revised.sourceHash);checks++;
 await assert.rejects(save({...p,sourceHash:'bad'}));assert.equal((await db.query('select count(*)::int n from grid_operation_revisions')).rows[0].n,2);checks++;
 await assert.rejects(save({...p,sourceHash:'b'.repeat(64),raw:{oversize:'a'.repeat(4194305)}}));checks++;
 await db.exec("UPDATE grid_operation_revisions SET last_seen_at=now()-interval '4 days' WHERE source_hash='"+p.sourceHash+"'");await save(revised);assert.equal((await db.query('select count(*)::int n from grid_operation_revisions')).rows[0].n,1);checks++;
 console.log(JSON.stringify({checks,passed:true,engine:'PGlite isolated PostgreSQL; not live Supabase',covers:['migration','public/raw access denied','service permissions','lease exclusion','idempotency','revision preservation','out-of-order write','atomic rejection','payload bound','retention']},null,2));
}finally{await db.close()}
