import {scheduledSite} from './physicalNotifications.mjs';
export function notificationReading(asset,feed,now=Date.now()){
 const mapping=feed?.mappings?.find(m=>m.id===asset.id);
 // Legacy snapshots remain readable only for the already reviewed pilot.
 const units=mapping?.status==='verified'?mapping.units:!feed?.mappings&&asset.unitMatch?.status==='verified'?asset.units:[];
 const reading=scheduledSite(feed?.records||[],units,feed?.from,feed?.to);
 const current=Date.parse(feed?.from)<=now&&now<Date.parse(feed?.to);
 return {...reading,current,status:mapping?.status||'unmapped',note:mapping?.note,units};
}
export function validateNotificationMappings(mappings,registry,catalogue){
 const owners=new Map();for(const m of mappings.entries)for(const u of m.units){const ids=owners.get(u)||new Set();ids.add(m.id);owners.set(u,ids)}
 return mappings.entries.map(m=>{
  const asset=catalogue.find(a=>a.id===m.id);const issues=[];
  if(!asset||!(asset.installedCapacityMW>100))issues.push('No qualifying operational catalogue entry');
  if(m.status!=='verified')issues.push(m.note);
  for(const u of m.units){const rr=registry.filter(r=>r.elexonBmUnit===u);const expected=m.registryEvidence.find(r=>r.elexonBmUnit===u);
   if(!rr.length||!expected||rr.some(r=>r.bmUnitName!==expected.bmUnitName||r.leadPartyName!==expected.leadPartyName||r.fuelType!==expected.fuelType||r.fpnFlag!==true))issues.push('Registry identity/notification flag changed: '+u);
   if(owners.get(u)?.size!==1)issues.push('Unit assigned to multiple sites: '+u);
  }
  return {id:m.id,name:m.name,status:issues.length?'review-required':'verified',units:issues.length?[]:m.units,note:issues.join('; ')||m.note};
 });
}
export function buildNotificationFeed(rows,mappings,from,to,checkedAt){
 if(!Array.isArray(rows))throw Error('Invalid PN response');
 const units=new Set(mappings.filter(m=>m.status==='verified').flatMap(m=>m.units));
 const records=rows.filter(r=>r.dataset==='PN'&&units.has(r.bmUnit));
 if(!records.length)throw Error('No mapped PN records for requested interval');
 return {schemaVersion:2,kind:'scheduled',unit:'MW',from,to,checkedAt,publishedAt:null,source:'Elexon physical notifications (PN)',attribution:'Contains BMRS data © Elexon Limited copyright and database right 2026.',publicationNote:'Row publication time unavailable. checkedAt is retrieval time, not publication time.',mappings,records};
}
