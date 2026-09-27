import {edgeJSON,snapshot} from '../lib/shared-cache';
export async function onRequestGet(context:any){return edgeJSON(context,'grid-evidence-v2',300,async()=>{
 const base=await context.env.ASSETS.fetch(new URL('/data/grid-evidence.json',context.request.url)).then((r:Response)=>r.json());
 try {
  const current=await snapshot('public-grid-v1');
  if(current.schemaVersion!==1||!current.sources?.FUELHH)throw Error('Invalid schema');
  return {...base,...current,sources:{...base.sources,...current.sources}};
 }catch{return {...base,transportStatus:'fallback',transportNote:'Scheduled cache unavailable; dated release snapshot retained'}}
})}
