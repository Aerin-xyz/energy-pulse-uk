// PN is scheduled MW, never actual generation. Require contiguous full-period
// coverage for every verified production unit; reject conflicting overlaps.
export function scheduledSite(rows,units,from,to){
 const start=Date.parse(from),end=Date.parse(to);if(!units.length||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return {mw:null,coverage:0,total:units.length};
 const values=units.map(unit=>{
  const seen=new Set();const segments=rows.filter(r=>r.dataset==='PN'&&r.bmUnit===unit).filter(r=>{const key=JSON.stringify([r.timeFrom,r.timeTo,r.levelFrom,r.levelTo]);if(seen.has(key))return false;seen.add(key);return true}).filter(r=>Date.parse(r.timeTo)>start&&Date.parse(r.timeFrom)<end).sort((a,b)=>Date.parse(a.timeFrom)-Date.parse(b.timeFrom));
  let cursor=start,energy=0;
  for(const r of segments){const a=Date.parse(r.timeFrom),b=Date.parse(r.timeTo),lo=Math.max(start,a),hi=Math.min(end,b);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||lo!==cursor||!Number.isFinite(r.levelFrom)||!Number.isFinite(r.levelTo))return null;
   const v0=r.levelFrom+(r.levelTo-r.levelFrom)*(lo-a)/(b-a),v1=r.levelFrom+(r.levelTo-r.levelFrom)*(hi-a)/(b-a);energy+=(v0+v1)/2*(hi-lo);cursor=hi;
  }
  return cursor===end?energy/(end-start):null;
 });return {mw:values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null,coverage:values.filter(v=>v!==null).length,total:units.length};
}

