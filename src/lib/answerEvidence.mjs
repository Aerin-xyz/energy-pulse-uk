import {sourceState} from './gridMetrics.mjs';
export const answerPaths = {'/uk-electricity-mix':'mix','/uk-wind-power-today':'wind','/uk-solar-power-today':'solar','/interconnectors':'interconnectors','/carbon-intensity-today':'carbon'};
export function answerEvidence(data,path,now=Date.now()) {
 const topic=answerPaths[path.replace(/\/$/,'')];
 const absent={status:'unavailable',title:'Current readings unavailable',text:'No verified current observation is available for this answer. Historical reports are dated separately; missing readings are not zero.',source:'https://bmrs.elexon.co.uk/'};
 if(!topic || data?.definitionVersion!=='gb-evidence-v1' || data.units!=='MW')return absent;
 const end=data.observedAt, valid=sourceState(end,30,now).fresh;
 const period=Number.isFinite(Date.parse(end))?`${new Date(Date.parse(end)-1800000).toISOString()} to ${new Date(end).toISOString()} (UTC)`:'';
 const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 const base={status:'available',title:'Latest published observation',source:'https://bmrs.elexon.co.uk/',expiresAt:Date.parse(end)+3600000};
 if(topic==='solar')return {...absent,text:'The canonical metered snapshot does not include a verified solar estimate. Solar is not zero: use the separately dated NESO estimate in the historical context below.',source:'https://www.neso.energy/data-portal/demand-data-update'};
 if(topic==='carbon'){
  const c=data.carbonIntensity;
  if(!finite(c?.actual)||c.status!=='ok'||!sourceState(c.intervalTo,30,now).fresh||Date.parse(c.intervalTo)-Date.parse(c.intervalFrom)!==1800000)return {...absent,source:'https://carbonintensity.org.uk/'};
  return {...base,expiresAt:Date.parse(c.intervalTo)+3600000,source:'https://api.carbonintensity.org.uk/intensity',text:`Great Britain’s reported actual carbon intensity was ${c.actual} gCO₂/kWh for ${c.intervalFrom} to ${c.intervalTo} (UTC). This is the source’s published intensity estimate, not a forecast, instantaneous reading or household tariff.`};
 }
 if(!valid||data.dataFreshness?.variant!=='completed-half-hour'||data.dataFreshness?.sourceFreshness?.generation?.status!=='live')return absent;
 if(topic==='wind'){
  const rows=data.generationMix?.filter(x=>x.name==='Wind')||[];
  if(rows.length!==1||!finite(rows[0].value))return absent;
  return {...base,text:`Great Britain’s transmission-metered wind averaged ${rows[0].value} MW during ${period}. Elexon completed-half-hour output; embedded-wind estimates and installed capacity are not included. Source readings may be revised.`};
 }
 if(topic==='mix'){
  if(!finite(data.totalGenerationMW))return absent;
  return {...base,text:`Great Britain’s transmission-metered generation averaged ${data.totalGenerationMW} MW during ${period}. Elexon completed-half-hour output excludes imports, embedded estimates and pumped storage; Other may include battery output. This is not a whole-system total. Source readings may be revised.`};
 }
 const rows=data.interconnectors;
 if(!Array.isArray(rows)||rows.length!==7||new Set(rows.map(x=>x.country)).size!==7||rows.some(x=>!Number.isFinite(x.flow)||x.status!=='live'||Date.parse(x.asOf)!==Date.parse(end)))return absent;
 const imports=rows.reduce((s,x)=>s+Math.max(0,x.flow),0),exports=rows.reduce((s,x)=>s+Math.max(0,-x.flow),0);
 return {...base,text:`Reported GB cross-border transfers during ${period}: imports ${imports} MW, exports ${exports} MW and signed net imports ${imports-exports} MW. These are completed-half-hour averages across the published country groups, not domestic generation or a reason for any particular trade.`};
}
export function readInitialAnswer(path,now=Date.now()) {
 if(typeof document==='undefined')return null;
 try{const x=JSON.parse(document.getElementById('initial-answer-evidence')?.textContent||'null');return x?.path===path.replace(/\/$/,'')&&(x?.answer?.expiresAt>=now || (x?.answer?.status==='unavailable' && x.createdAt+60000>=now))?x.answer:null;}catch{return null;}
}
export function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function answerMarkup(a){return `<h2 class="text-xl font-semibold text-foreground">${escapeHTML(a.title)}</h2><p class="mt-3 text-sm text-foreground/75">${escapeHTML(a.text)}</p><p class="mt-3 text-sm text-foreground/75">Great Britain covers England, Scotland and Wales; Northern Ireland operates in a separate electricity market.</p><p class="mt-3 text-sm"><a href="${escapeHTML(a.source)}">Official source</a> · <a href="/methodology/">Definitions and limitations</a> · <a href="/reports/">Dated reports</a></p>`;}
