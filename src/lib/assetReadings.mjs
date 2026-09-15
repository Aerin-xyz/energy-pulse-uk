// B1610 quantity is MWh in a half-hour. Never combine different intervals or
// substitute missing units with zero. Use the most mature settlement revision.
const runs = ['II','SF','R1','R2','R3','RF','DF'];
export function assetReading(rows, units, date, period) {
 const found = units.map(unit => rows.filter(r=>r.bmUnit===unit && r.psrType==='Generation' && r.settlementDate===date && r.settlementPeriod===period && typeof r.quantity==='number' && Number.isFinite(r.quantity)).sort((a,b)=>runs.indexOf(b.settlementRunType)-runs.indexOf(a.settlementRunType))[0]);
 const available=found.filter(Boolean);
 return {mw:available.length===units.length ? available.reduce((sum,r)=>sum+r.quantity*2,0) : null, coverage:available.length,total:units.length};
}
