import {chromium} from 'playwright';import {writeFileSync}from'node:fs';
const b=await chromium.launch({headless:true});const results=[];
for(const width of [390,1366])for(const path of ['/','/network-constraints/','/carbon-intensity/','/explore/']){
 const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.auditVitals={cls:0,lcp:0};new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.auditVitals.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{window.auditVitals.lcp=l.getEntries().at(-1).startTime}).observe({type:'largest-contentful-paint',buffered:true})});
 const r=await p.goto('https://energymix.info'+path);await p.waitForTimeout(7000);
 const info=await p.evaluate(()=>({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText.slice(0,16000),vitals:window.auditVitals,resources:performance.getEntriesByType('resource').reduce((a,r)=>({count:a.count+1,transfer:a.transfer+r.transferSize,decoded:a.decoded+r.decodedBodySize}),{count:0,transfer:0,decoded:0})}));
 await p.screenshot({path:`docs/grid-intelligence/evidence/${width}-${path.replaceAll('/','')||'home'}.png`,fullPage:true});results.push({width,path,status:r.status(),errors,...info});console.log(width,path,r.status(),info.overflow,errors.length);
 await p.close();
}await b.close();writeFileSync('docs/grid-intelligence/evidence/browser.json',JSON.stringify(results,null,2));
