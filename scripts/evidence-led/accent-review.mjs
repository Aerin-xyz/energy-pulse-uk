import {chromium} from '@playwright/test';
import fs from 'node:fs';
const base=process.env.REVIEW_BASE||'http://127.0.0.1:4185';
const dir='docs/evidence-led/accents'; fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch();const results=[];
for(const width of [390,1440]){
 const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 for(const route of ['/','/explore/','/carbon-intensity/','/reports/','/methodology/','/cleanest-time-to-use-electricity/']){
 const errors=[];const listener=e=>errors.push(e.message);p.on('pageerror',listener);
 await p.goto(base+route,{waitUntil:'networkidle'});
 await p.addScriptTag({path:'/tmp/energy-review-a11y/node_modules/axe-core/axe.min.js'});
 const scan=await p.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,violations:(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}));
 results.push({width,route,...scan,errors});
 await p.screenshot({path:`${dir}/${base.includes('energymix.info')?'live':'review'}-${route.replaceAll('/','')||'home'}-${width}.png`,fullPage:true});
 p.off('pageerror',listener);
 }
 await p.close();
}
await b.close();fs.writeFileSync(`${dir}/${base.includes('energymix.info')?'live':'review'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
if(results.some(r=>r.overflow||r.errors.length||r.violations.length))process.exitCode=1;
