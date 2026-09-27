import {halfHours,revisedRows} from './calculations.mjs';
import {sourceStatus,truthfulFreshness} from './ingestion.mjs';
const colors={Wind:'#00d9bf',Solar:'#f5d45e',Nuclear:'#ac83ff',Gas:'#439cf5',Hydro:'#20c5ee',Biomass:'#92d375',Other:'#758ca2',Coal:'#b9bfc8',OCGT:'#d48d59',Oil:'#999999'};
export function canonicalEnergy(grid,enrichment={},now=Date.now()) {
 const current=halfHours(grid.sources?.FUELHH?.records||[],grid.sources?.INDO?.records||[],now).at(-1);
 if(!current)throw Error('No completed national observation');
 const generationMix=current.generationMix.filter(x=>Number.isFinite(x.value)).map(x=>({name:x.name,value:x.value,color:colors[x.name],percentage:Number.isFinite(current.generationMW)&&current.generationMW>0?x.value/current.generationMW*100:null}));
 const generationStatus=sourceStatus(current.to,30,now);
 const demandAt=Number.isFinite(current.demandMW)?current.to:null;
 const meterRows=revisedRows(grid.sources?.FUELHH?.records||[],now).filter(r=>r.startTime===current.from);
 const groups=[['France',4000,['INTFR','INTIFA2','INTELEC']],['Netherlands',1000,['INTNED']],['Belgium',1000,['INTNEM']],['Norway',1400,['INTNSL']],['Denmark',1400,['INTVKL']],['Ireland',1000,['INTEW','INTGRNL']],['Northern Ireland',500,['INTIRL']]];
 const interconnectors=groups.map(([country,capacity,codes])=>{const values=codes.map(code=>meterRows.find(r=>r.fuelType===code)?.generation);const flow=values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;return {name:country,country,capacity,flow,asOf:current.to,status:flow===null?'unavailable':generationStatus,source:'Elexon FUELHH'};});
 const freshness={...truthfulFreshness(enrichment,now).dataFreshness,source:'Elexon FUELHH/INDO completed-period outturn',isRealtime:generationStatus==='live',status:generationStatus,sourceFreshness:{...truthfulFreshness(enrichment,now).dataFreshness.sourceFreshness,
  interconnectors:{label:'Completed-period transfers',source:'Elexon FUELHH',timestamp:current.to,cadenceMinutes:30,status:interconnectors.some(x=>x.flow===null)?'unavailable':generationStatus},
  generation:{label:'Transmission-metered generation',source:'Elexon FUELHH',timestamp:current.to,cadenceMinutes:30,status:generationStatus},
  demand:{label:'Initial national demand',source:'Elexon INDO',timestamp:demandAt,cadenceMinutes:30,status:sourceStatus(demandAt,30,now)},
  storage:{label:'Signed pumped storage',source:'Elexon FUELHH',timestamp:Number.isFinite(current.storageMW)?current.to:null,cadenceMinutes:30,status:sourceStatus(Number.isFinite(current.storageMW)?current.to:null,30,now)}
 }};
 return {...enrichment,generationMix,interconnectors,demandBreakdown:null,totalGenerationMW:current.generationMW,totalDemandMW:current.demandMW,
  definitionVersion:'gb-evidence-v1',coverage:'GB transmission-metered generation; excludes embedded estimates, imports and storage',
  lastUpdated:grid.generatedAt,observedAt:current.to,publicationTimes:current.publicationTimes,
  asOf:{endISO:current.to,percentageSum:current.generationMW>0?100:null},
  storage:Number.isFinite(current.storageMW)?{netMW:current.storageMW,absMW:Math.abs(current.storageMW),mode:current.storageMW>0?'generating':current.storageMW<0?'charging':'idle',label:'Signed metered pumped-storage output',timestamp:current.to,source:'Elexon FUELHH'}:null,
  dataFreshness:freshness};
}
