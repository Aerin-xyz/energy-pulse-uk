export function filterAssets(assets,{fuel='All',search='',pilotOnly=false,country='All GB',availability='All data',snapshot,operations,minCapacity=0,sort='name'}={}){
 const q=search.trim().toLowerCase();
 return assets.filter(a=>(!minCapacity||(Number.isFinite(a.installedCapacityMW)&&a.installedCapacityMW>minCapacity))&&(!pilotOnly||a.releaseSelection)&&(fuel==='All'||a.type===fuel)&&(country==='All GB'||a.country===country)&&(!q||`${a.name} ${a.type} ${a.country}`.toLowerCase().includes(q))).filter(a=>{
  const measured=a.unitMatch.status==='verified'&&Number.isFinite(snapshot?.points?.at(-1)?.values[a.id]?.mw);
  const scheduled=a.unitMatch.status==='verified'&&scheduledSite(operations?.records||[],a.units,operations?.from,operations?.to).mw!==null;
  if(availability==='Notified schedule')return scheduled;
  return availability==='All data'||(availability==='Metered history'?measured:!measured&&!scheduled);
 }).sort((a,b)=>sort==='capacity'?b.installedCapacityMW-a.installedCapacityMW:a.name.localeCompare(b.name));
}
export function assetClusters(assets,zoom=1){
 const groups=new Map(),cell=28/zoom;
 for(const a of assets){const x=(a.longitude+12)*40,y=(61-a.latitude)*63,key=Math.floor(x/cell)+':'+Math.floor(y/cell);const g=groups.get(key);if(g){g.sumX+=x;g.sumY+=y;g.members.push(a)}else groups.set(key,{sumX:x,sumY:y,members:[a]});}
 return [...groups.values()].map(g=>({x:g.sumX/g.members.length,y:g.sumY/g.members.length,members:g.members}));
}
export function assetView(cx=415,cy=350,zoom=1){const z=Math.max(1,Math.min(32,zoom)),w=620/z,h=850/z;return {zoom:z,cx:Math.max(65+w/2,Math.min(920-w/2,cx)),cy:Math.max(-75+h/2,Math.min(810-h/2,cy)),w,h};}
export const capacityText=value=>Number.isFinite(value)?value.toLocaleString('en-GB')+' MW':'Capacity unavailable';
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

export function assetEvidenceLabel(asset,snapshot,operations){const measured=asset.unitMatch.status==='verified'&&Number.isFinite(snapshot?.points?.at(-1)?.values[asset.id]?.mw);const scheduled=asset.unitMatch.status==='verified'&&scheduledSite(operations?.records||[],asset.units,operations?.from,operations?.to).mw!==null;return [measured?'Measured history':null,scheduled?'Notified schedule':null].filter(Boolean).join(' · ')||'Capacity / location only';}
