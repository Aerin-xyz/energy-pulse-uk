import {notificationReading} from './notificationFeed.mjs';
export {scheduledSite} from './physicalNotifications.mjs';
export function filterAssets(assets,{fuel='All',search='',pilotOnly=false,country='All GB',availability='All data',snapshot,operations,minCapacity=0,sort='name'}={}){
 const q=search.trim().toLowerCase();
 return assets.filter(a=>(!minCapacity||(Number.isFinite(a.installedCapacityMW)&&a.installedCapacityMW>minCapacity))&&(!pilotOnly||a.releaseSelection)&&(fuel==='All'||a.type===fuel)&&(country==='All GB'||a.country===country)&&(!q||`${a.name} ${a.type} ${a.country}`.toLowerCase().includes(q))).filter(a=>{
  const measured=a.unitMatch.status==='verified'&&Number.isFinite(snapshot?.points?.at(-1)?.values[a.id]?.mw);
  const notification=notificationReading(a,operations);const scheduled=notification.current&&notification.mw!==null;
  if(availability==='Notified schedule')return scheduled;
  return availability==='All data'||(availability==='Metered history'?measured:!measured&&!scheduled);
 }).sort((a,b)=>sort==='capacity'?b.installedCapacityMW-a.installedCapacityMW:a.name.localeCompare(b.name));
}
export function assetClusters(assets,zoom=1){
 const groups=new Map(),cell=28/zoom;
 for(const a of assets){const x=(a.longitude+12)*40,y=(61-a.latitude)*63,key=Math.floor(x/cell)+':'+Math.floor(y/cell);const g=groups.get(key);if(g){g.sumX+=x;g.sumY+=y;g.members.push(a)}else groups.set(key,{sumX:x,sumY:y,members:[a]});}
 return [...groups.values()].map(g=>({x:g.sumX/g.members.length,y:g.sumY/g.members.length,members:g.members}));
}
export function assetView(cx=415,cy=350,zoom=1){const z=Math.max(1,Math.min(32,zoom)),w=500/z,h=800/z;return {zoom:z,cx:Math.max(65+w/2,Math.min(920-w/2,cx)),cy:Math.max(-75+h/2,Math.min(810-h/2,cy)),w,h};}
export const capacityText=value=>Number.isFinite(value)?value.toLocaleString('en-GB')+' MW':'Capacity unavailable';

export function assetEvidenceLabel(asset,snapshot,operations){
 const measured=asset.unitMatch.status==='verified'&&Number.isFinite(snapshot?.points?.at(-1)?.values[asset.id]?.mw);
 const n=notificationReading(asset,operations);
 return [n.current&&n.mw!==null?`${Math.round(n.mw).toLocaleString('en-GB')} MW notified`:n.mw!==null?'Past notification':null,measured?'Measured history':null].filter(Boolean).join(' · ')||(n.status==='review-required'?'Notification match under review':'Capacity / location only');
}
