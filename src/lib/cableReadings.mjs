import { finite, sourceState } from './gridMetrics.mjs';
// FUELINST generation is MW, NOT settlement MWh. Positive imports to GB.
export function cableReadings(rows, code, now=Date.now()) {
 const times=new Map();
 for(const r of rows||[]) {
  const t=Date.parse(r.startTime),published=Date.parse(r.publishTime);
  if(r.fuelType!==code||!finite(r.generation)||!Number.isFinite(t)||t>now||!Number.isFinite(published)||published>now) continue;
  const old=times.get(t);
  if(!old||published>Date.parse(old.publishTime)) times.set(t,r);
 }
 const history=[...times.values()].sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
 const latest=history.at(-1);
 return {mw:latest?.generation??null,at:latest?.startTime??null,publishedAt:latest?.publishTime??null,history,freshness:sourceState(latest?.startTime,5,now)};
}
export function cableLoading(mw, capacity) {return finite(mw)&&finite(capacity)&&capacity>0?Math.abs(mw)/capacity*100:null;}
