import {edgeJSON} from '../lib/shared-cache';
import {SUPABASE_URL,SUPABASE_ANON} from '../lib/public-supabase';
export async function onRequestGet(context:any){
 const url=new URL(context.request.url);const period=url.searchParams.get('period')==='7d'?'7d':'24h';
 const forecast=url.searchParams.get('forecast')==='true';
 return edgeJSON(context,'history-'+period+'-'+forecast,1800,async()=>{
  const r=await fetch(SUPABASE_URL+'/functions/v1/historical-generation?period='+period,{method:forecast?'POST':'GET',headers:{apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON,'Content-Type':'application/json'},...(forecast?{body:JSON.stringify({includeForecast:true})}:{}),signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('Historical source unavailable');const body=await r.json();if(!Array.isArray(body.data)||body.error)throw Error('Invalid history');return body;
 });
}
