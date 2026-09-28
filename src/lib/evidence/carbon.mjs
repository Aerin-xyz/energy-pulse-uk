// Carbon intervals are half-hour emissions estimates, not instantaneous telemetry.
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export function normalizeCarbon(row, fetchedAt = new Date().toISOString()) {
 const from=Date.parse(row?.from), to=Date.parse(row?.to), checked=Date.parse(fetchedAt);
 if(!Number.isFinite(from)||!Number.isFinite(to)||!Number.isFinite(checked)||to-from!==1800000||from>checked)throw Error('Invalid carbon interval');
 const actual=numeric(row.intensity?.actual),forecast=numeric(row.intensity?.forecast);
 if(actual===null&&forecast===null)throw Error('No valid carbon intensity');
 if(actual!==null&&to>checked)throw Error('Actual carbon interval has not completed');
 return {schemaVersion:2,actual,forecast,index:typeof row.intensity?.index==='string'?row.intensity.index:'unknown',basis:actual===null?'forecast-only':'actual',intervalFrom:new Date(from).toISOString(),intervalTo:new Date(to).toISOString(),timestamp:new Date(to).toISOString(),fetchedAt,source:'Carbon Intensity API',sourceUrl:'https://api.carbonintensity.org.uk/intensity',status:'ok',percentOfAverage:actual===null?null:actual/233*100-100};
}
export function retainCarbon(previous, attemptedAt) {
 // Legacy payloads may have put a forecast in `actual`; never carry that ambiguity forward.
 return previous?.schemaVersion===2 ? {...previous,status:'retained',lastAttemptedAt:attemptedAt,error:'Carbon refresh unavailable; last-good interval retained'} : null;
}
export function enrichmentCacheTTL(now=Date.now()) {
 // Expire five seconds BEFORE the next :01/:06 cron, not five minutes after work finishes.
 const next=(Math.floor((now-60000)/300000)+1)*300000+60000;
 return Math.max(1,Math.min(300,Math.floor((next-now-5000)/1000)));
}
export function carbonPresentation(carbon, now=Date.now()) {
 const actual=numeric(carbon?.actual),forecast=numeric(carbon?.forecast);
 const from=Date.parse(carbon?.intervalFrom),to=Date.parse(carbon?.intervalTo);
 const time=iso=>new Date(iso).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'});
 const interval=Number.isFinite(from)&&Number.isFinite(to)?`${new Date(from).toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'})} · ${time(from)}–${time(to)} UK`:'Source interval unavailable';
 const ended=Number.isFinite(to)&&to<=now;
 const age=ended?Math.floor((now-to)/60000):null;
 return {value:actual??'—',basis:actual===null?'Actual unavailable':'Reported actual',forecast:forecast===null?'Forecast unavailable':`Forecast ${forecast} gCO₂/kWh`,interval,freshness:carbon?.status==='retained'?'Refresh unavailable · retained interval':age===null?'Interval not yet complete':`${age>60?'Delayed · ':''}${age}m since interval ended`};
}
