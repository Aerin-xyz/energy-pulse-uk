import fs from'node:fs/promises';import {gridEvidenceHealth}from'../src/lib/operations/monitor.mjs';
const feed=JSON.parse(await fs.readFile(process.argv[2]||'public/data/grid-evidence.json','utf8'));const health=gridEvidenceHealth(feed);console.log(JSON.stringify(health,null,2));
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,'## Source completion and observation health\n\n'+health.sources.map(s=>`- ${s.dataset}: ${s.status}; ${s.warnings.join(', ')||'no detected breach'}; last successful check ${s.checkedAt||'unknown'}`).join('\n')+'\n');
if(health.status!=='ok')process.exitCode=1;
