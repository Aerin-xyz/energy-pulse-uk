export function gridEvidenceHealth(feed,now=Date.now()){
 const sources=Object.entries(feed?.sources||{}).map(([dataset,s])=>{
  const age=Number.isFinite(Date.parse(s.checkedAt))?(now-Date.parse(s.checkedAt))/60000:null;
  const warnings=[];if(s.error)warnings.push('refresh-failed');if(!s.records?.length)warnings.push('no-records');if(age===null||age>Math.max(120,(s.refreshMinutes||60)*3))warnings.push('check-overdue');
  const latest=dataset==='dayAhead'?(s.records||[]).map(r=>r.from).filter(Boolean).sort().at(-1):null;
  if(dataset==='dayAhead'&&(!latest||Date.parse(latest)<now))warnings.push('forecast-expired');
  return {dataset,status:warnings.length?'needs-attention':'ok',warnings,checkedAt:s.checkedAt||null,latestForecastStart:latest||null,error:s.error||null};
 });return {checkedAt:new Date(now).toISOString(),status:!sources.length||sources.some(s=>s.status!=='ok')?'needs-attention':'ok',sources};
}
