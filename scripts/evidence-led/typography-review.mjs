import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();const results=[];fs.mkdirSync('docs/typography/screens',{recursive:true});
for(const width of [320,390,430,768,1366,1920]){
 const p=await b.newPage({viewport:{width,height:900}});
 for(const route of (width===390||width===1366?['/','/carbon-intensity/','/reports/','/methodology/','/explore/']:['/'])){
 const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4187'+route,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 const info=await p.evaluate(()=>({loaded:document.fonts.check('500 16px Rajdhani'),heading:getComputedStyle(document.querySelector('h1')).fontFamily,body:getComputedStyle(document.body).fontFamily,overflow:document.documentElement.scrollWidth>innerWidth,externalFontRequests:performance.getEntriesByType('resource').filter(x=>/fonts.googleapis|fonts.gstatic/.test(x.name)).length}));
 await p.addScriptTag({path:'/tmp/energy-review-a11y/node_modules/axe-core/axe.min.js'});
 const violations=await p.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}})).violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})));
 results.push({width,route,...info,errors,violations});
 await p.screenshot({path:`docs/typography/screens/${route.replaceAll('/','')||'home'}-${width}.png`,fullPage:false});
 }await p.close();
}await b.close();fs.writeFileSync('docs/typography/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(x=>!x.loaded||x.overflow||x.errors.length||x.violations.length||x.externalFontRequests))process.exitCode=1;
