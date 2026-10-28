// Deliberately allow only documented field versions, retaining the original record.
export function normalizeCosts(fields,records){
 const names=new Set(fields.map(f=>f.id));const candidates=['Daily Cost (GBP)','Daily Cost GBP'].filter(k=>names.has(k));
 if(!names.has('Settlement Date')||!names.has('Constraint Group')||!candidates.length)throw Error('NESO cost schema changed');
 return records.map(r=>{const values=candidates.map(k=>r[k]);if(values.some(v=>typeof v!=='number'||!Number.isFinite(v))||new Set(values).size!==1)throw Error('Missing/conflicting NESO cost');if(typeof r['Constraint Group']!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r['Settlement Date']))throw Error('Invalid cost identity');return {...r,'Daily Cost (GBP)':values[0],sourceCostField:candidates.join('|')};});
}
export function forecastCoverage(records,now=Date.now()){
 const times=records.map(r=>Date.parse(r.from)).filter(Number.isFinite);
 const latest=times.length?Math.max(...times):null;
 return {latestPeriodStart:latest===null?null:new Date(latest).toISOString(),status:latest===null?'unavailable':latest<now?'expired':'available',ambiguousTimes:records.filter(r=>!r.from).length,note:'Retrieval time does not advance a forecast horizon. Ambiguous London clock-change times remain unusable.'};
}
