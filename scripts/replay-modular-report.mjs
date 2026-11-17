import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {dirname,join} from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {sha,validatorHash} from './collect-report-modules.mjs';
import {validateModules,aggregateModules} from '../src/lib/evidence/reportModules.mjs';
export function replayModularReport(path){
 const m=JSON.parse(readFileSync(path)),raw={};assert.equal(m.schemaVersion,3);assert.equal(m.validatorSha256,validatorHash(),'Use the validator revision recorded in the manifest');
 for(const a of m.artifacts){const b=gunzipSync(readFileSync(join(dirname(path),a.file)));assert.equal(sha(b),a.sha256,'Source hash mismatch '+a.file);try{raw[a.file]=JSON.parse(b);}catch{/* Failed parsing is recorded in sourceErrors; hash still verified. */}}
 const elexon=Object.entries(raw).filter(([k])=>k.startsWith('elexon-')).flatMap(([,v])=>v.data);
 for(const d of m.days){const neso=raw[d.date+'-neso.json.gz'],carbon=raw[d.date+'-carbon.json.gz'];const errors={...d.sourceErrors};
  if(!Object.keys(raw).some(k=>k.startsWith('elexon-')))errors.elexon=d.modules.metered.errors[0];
  if(!neso)errors.neso=d.modules.solar.errors[0];if(!carbon)errors.carbon=d.modules.carbon.errors[0];
  const v=validateModules(d.date,{elexon,neso:neso?.result?.records,carbon:carbon?.data,errors});if(d.sourceErrors)v.sourceErrors=errors;assert.deepEqual(v,d,'Daily replay differs '+d.date);
 }
 assert.deepEqual(aggregateModules(m.days),m.modules);return m;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){const m=replayModularReport(process.argv[2]);console.log(`Reproduced ${m.days.length} days, hashes and all module calculations; status ${m.status}.`);}
