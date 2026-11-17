// Reproducible local preview; always restore the published archive and generated data.
import {readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,rmSync} from 'node:fs';import {dirname} from 'node:path';import {spawnSync} from 'node:child_process';
import {presentReport} from '../src/lib/evidence/reportPresentation.mjs';
const v=JSON.parse(readFileSync('docs/report-repair/fixture/result.json'));const generated=presentReport(v);
const files=['src/data/energyMixGenerated.json','src/data/reportArchive.json','public/sitemap.xml'];const backups=files.map(p=>readFileSync(p));
const target='public'+dirname(v.evidencePath);if(existsSync(target))throw Error('Refusing to overwrite an existing evidence pack');
try{
 const archive=JSON.parse(backups[1]);if(archive.some(r=>r.slug===generated.latestReportSlug))throw Error('Fixture date already published; choose a new isolated test fixture');archive.unshift(generated.reports[0]);
 writeFileSync(files[0],JSON.stringify(generated,null,2)+'\n');writeFileSync(files[1],JSON.stringify(archive,null,2)+'\n');mkdirSync(dirname(target),{recursive:true});cpSync('docs/report-repair/fixture/source',target,{recursive:true});
 for(const [cmd,args]of [['npm',['run','build']],['npx',['tsc','--noEmit']],['npx',['playwright','test','tests/report-repair.spec.ts']]]){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)throw Error(cmd+' failed');}
}finally{for(let i=0;i<files.length;i++)writeFileSync(files[i],backups[i]);rmSync(target,{recursive:true,force:true});}
