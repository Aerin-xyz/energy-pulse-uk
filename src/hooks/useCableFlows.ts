import { useEffect, useState } from 'react';
export type CableRow={fuelType:string;generation:number;startTime:string;publishTime:string};
export function useCableFlows() {
 const [rows,setRows]=useState<CableRow[]>([]);const [error,setError]=useState(false);const [retrievedAt,setRetrievedAt]=useState<string|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  const refresh=async()=>{if(busy)return;busy=true;try{
   const now=Date.now();const query=new URLSearchParams({publishDateTimeFrom:new Date(now-6*3600000).toISOString(),publishDateTimeTo:new Date(now).toISOString(),format:'json'});
   const r=await fetch(`https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELINST?${query}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   if(!r.ok)throw Error('Feed unavailable');const json=await r.json();if(!Array.isArray(json.data))throw Error('Invalid feed');
   if(!controller.signal.aborted){setRows(json.data.filter((r:CableRow)=>typeof r.fuelType==='string'&&r.fuelType.startsWith('INT')));setRetrievedAt(new Date().toISOString());setError(false)}
  }catch{if(!controller.signal.aborted)setError(true)}finally{busy=false}};
  void refresh();const timer=setInterval(()=>{if(document.visibilityState!=="hidden")void refresh()},300000);return()=>{controller.abort();clearInterval(timer)};
 },[]);
 return {rows,error,retrievedAt};
}
