import {settlementStart,expectedPeriods} from '../../../supabase/functions/_shared/settlementTime.mjs';
export const VERSION='gb-operations-v1';
export const ELEXON='https://data.elexon.co.uk/bmrs/api/v1/';
export const ELEXON_LICENCE='https://www.elexon.co.uk/bsc/operations-settlement/bsc-central-services/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/';
export const ATTRIBUTION='Contains BMRS data © Elexon Limited copyright and database right 2026.';
export function requireDate(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid settlement date');return date;}
export function periodBounds(date,period){requireDate(date);if(!Number.isInteger(period)||period<1||period>expectedPeriods(date))throw Error('Invalid settlement period');const from=settlementStart(date,period);return {periodStart:from,periodEnd:new Date(Date.parse(from)+1800000).toISOString()};}
export const numeric=v=>v===null?null:typeof v==='number'&&Number.isFinite(v)?v:(()=>{throw Error('Numeric field missing or invalid')})();
export function instant(v,nullable=false){if(nullable&&v==null)return null;if(typeof v!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Invalid UTC/offset timestamp');return new Date(v).toISOString();}
export function sourceRows(body,code){if(!Array.isArray(body?.data)||!body.metadata?.datasets?.includes(code)||body.data.length>10000)throw Error('Source schema/size contract changed: '+code);return body.data;}
export function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function sha256(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:stable(value)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
// A same-version conflict is a validation failure, not arbitrary last-write-wins.
export function latestRows(rows){const selected=new Map();for(const row of rows){const old=selected.get(row.key);if(!old||String(row.sourcePublishedAt||'')>String(old.sourcePublishedAt||''))selected.set(row.key,row);else if(row.sourcePublishedAt===old.sourcePublishedAt&&stable(row)!==stable(old))throw Error('Conflicting source revision: '+row.key);}return [...selected.values()].sort((a,b)=>a.key.localeCompare(b.key));}
export function freshness(periodEnd,now=Date.now(),{delayMinutes=90,staleMinutes=180}={}){const age=(now-Date.parse(periodEnd))/60000;if(!Number.isFinite(age)||age<0)return 'unavailable';return age>staleMinutes?'stale':age>delayMinutes?'delayed':'current';}
export function validatePublication(value,now=Date.now()){const iso=instant(value,true);if(iso&&Date.parse(iso)>now+60000)throw Error('Future source publication');return iso;}
export {expectedPeriods};
