import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {settlementCoordinates} from '../supabase/functions/_shared/settlementTime.mjs';
import {collectReport} from './collect-report-modules.mjs';
import {presentReport} from '../src/lib/evidence/reportPresentation.mjs';
const ROOT=new URL('..',import.meta.url).pathname;
// Explicit output root enables source validation and browser previews without touching published archives.
const OUTROOT=process.env.REPORT_OUTPUT_ROOT||ROOT;
const today=settlementCoordinates(new Date().toISOString()).date;
const end=process.env.REPORT_END_DATE||new Date(Date.parse(today+'T12:00Z')-86400000).toISOString().slice(0,10);
const v=await collectReport({end,outRoot:join(OUTROOT,'public/data/validation/reports')});
const latest=join(OUTROOT,'public/data/validation/latest.json');mkdirSync(dirname(latest),{recursive:true});writeFileSync(latest,JSON.stringify(v,null,2)+'\n');
if(v.status!=='passed')throw Error('Metered report blocked: '+v.days.filter(d=>d.status==='failed').map(d=>`${d.date}: ${d.modules.metered.errors.slice(0,3).join('; ')}`).join(' | '));
const generated=presentReport(v),archivePath=join(OUTROOT,'src/data/reportArchive.json');
const archive=JSON.parse(readFileSync(existsSync(archivePath)?archivePath:join(ROOT,'src/data/reportArchive.json'),'utf8'));
const previous=archive.find(r=>r.slug===generated.latestReportSlug);
// Published report identity and figures remain frozen. Each replay has its own content-addressed evidence.
if(previous){console.log('Published report and generated summaries preserved; new source revision evidence retained separately.');process.exit(0);}
else archive.push({...generated.reports[0],archiveProvenance:{archivedAt:v.runAt,definition:'authoritative-report-v3',timeBasis:'Europe/London',validationStatus:'passed',coverage:'7 complete local reporting days'}});
archive.sort((a,b)=>b.slug.localeCompare(a.slug));
mkdirSync(dirname(archivePath),{recursive:true});writeFileSync(archivePath,JSON.stringify(archive,null,2)+'\n');writeFileSync(join(OUTROOT,'src/data/energyMixGenerated.json'),JSON.stringify(generated,null,2)+'\n');
console.log(JSON.stringify({status:v.status,modules:v.modules,manifest:v.localManifest,outputRoot:OUTROOT},null,2));
