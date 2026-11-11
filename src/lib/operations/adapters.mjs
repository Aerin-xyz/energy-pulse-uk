import {VERSION,ELEXON,ELEXON_LICENCE,ATTRIBUTION,requireDate,periodBounds,sourceRows,numeric,instant,latestRows,validatePublication,expectedPeriods} from './contracts.mjs';
export function sourceRequest(dataset,{date,period}={}){
 if(dataset==='BMUNITS')return ELEXON+'reference/bmunits/all';
 requireDate(date);
 if(dataset==='DISEBSP')return ELEXON+`balancing/settlement/system-prices/${date}?format=json`;
 periodBounds(date,period);
 if(dataset==='BOALF')return ELEXON+`balancing/acceptances/all?settlementDate=${date}&settlementPeriod=${period}&format=json`;
 if(['BOAV-bid','BOAV-offer'].includes(dataset))return ELEXON+`balancing/settlement/acceptance/volumes/all/${dataset.slice(5)}/${date}/${period}?format=json`;
 throw Error('Unsupported dataset');
}
function rowPeriod(r,date,period){if(r.settlementDate!==date||(period!=null&&r.settlementPeriod!==period))throw Error('Unexpected settlement scope');const bounds=periodBounds(date,r.settlementPeriod);if(instant(r.startTime)!==bounds.periodStart)throw Error('Settlement/UTC mismatch');return {settlementDate:date,settlementPeriod:r.settlementPeriod,...bounds};}
function identity(v){if(typeof v!=='string'||!v.trim()||v.length>160)throw Error('Missing/invalid unit ID');return v;}
export function parseSource(dataset,body,scope,now=Date.now()){
 let records,coverage='unknown',expected=null,missing=[];
 if(dataset==='DISEBSP'){
  expected=expectedPeriods(scope.date);
  records=sourceRows(body,'DISEBSP').map(r=>({key:`${scope.date}/${r.settlementPeriod}`,kind:'published-settlement',...rowPeriod(r,scope.date),sourcePublishedAt:validatePublication(r.createdDateTime,now),systemBuyPrice:numeric(r.systemBuyPrice),systemSellPrice:numeric(r.systemSellPrice),netImbalanceVolume:numeric(r.netImbalanceVolume),totalAcceptedBidVolume:numeric(r.totalAcceptedBidVolume),totalAcceptedOfferVolume:numeric(r.totalAcceptedOfferVolume),priceDerivationCode:typeof r.priceDerivationCode==='string'?r.priceDerivationCode:null,bsadDefaulted:typeof r.bsadDefaulted==='boolean'?r.bsadDefaulted:null,units:{systemBuyPrice:'GBP/MWh',systemSellPrice:'GBP/MWh',netImbalanceVolume:'MWh',totalAcceptedBidVolume:'MWh',totalAcceptedOfferVolume:'MWh'},finality:'latest published run; revisable'}));
  records=latestRows(records);const seen=new Set(records.map(r=>r.settlementPeriod));missing=Array.from({length:expected},(_,i)=>i+1).filter(i=>!seen.has(i));
  coverage=missing.length||records.some(r=>['systemBuyPrice','systemSellPrice','netImbalanceVolume','totalAcceptedBidVolume','totalAcceptedOfferVolume'].some(k=>r[k]===null))?'partial':'complete';
 }else if(dataset==='BOALF'){
  const bounds=periodBounds(scope.date,scope.period);
  records=sourceRows(body,'BOALF').map(r=>{const from=instant(r.timeFrom),to=instant(r.timeTo);if(to<=from||to<=bounds.periodStart||from>=bounds.periodEnd)throw Error('Instruction outside requested period');if(!Number.isInteger(r.acceptanceNumber))throw Error('Invalid acceptance number');
   return {key:`${identity(r.bmUnit)}/${r.acceptanceNumber}/${from}/${to}`,kind:'instructed',sourceSettlementDate:requireDate(r.settlementDate),unit:'MW',bmUnit:r.bmUnit,nationalGridBmUnit:r.nationalGridBmUnit??null,acceptanceId:r.acceptanceNumber,periodStart:from,periodEnd:to,requestedPeriod:bounds,acceptanceTime:instant(r.acceptanceTime),sourcePublishedAt:null,levelFrom:numeric(r.levelFrom),levelTo:numeric(r.levelTo),soFlag:typeof r.soFlag==='boolean'?r.soFlag:null,direction:null,directionNote:'Power level is not an incremental bid/offer volume; baseline not inferred'};});records=latestRows(records);
 }else if(dataset==='BOAV-bid'||dataset==='BOAV-offer'){
  const direction=dataset.slice(5);
  records=sourceRows(body,'BOAV').map(r=>{if(!Number.isInteger(r.acceptanceId))throw Error('Invalid acceptance ID');const volume=numeric(r.totalVolumeAccepted);if(volume!==null&&((direction==='bid'&&volume>0)||(direction==='offer'&&volume<0)))throw Error('Accepted-volume sign mismatch');return {key:`${scope.date}/${scope.period}/${identity(r.bmUnit)}/${r.acceptanceId}/${direction}`,kind:'instructed-settlement-volume',unit:'MWh',...rowPeriod(r,scope.date,scope.period),bmUnit:r.bmUnit,nationalGridBmUnit:r.nationalGridBmUnit??null,acceptanceId:r.acceptanceId,direction,volumeMWh:volume,sourcePublishedAt:validatePublication(r.createdDateTime,now),finality:'latest published settlement run; revisable'};});records=latestRows(records);
 }else if(dataset==='BMUNITS'){
  if(!Array.isArray(body)||body.length===0||body.length>10000)throw Error('BM Unit reference schema changed');
  records=latestRows(body.map(r=>({key:r.elexonBmUnit?identity(r.elexonBmUnit):'ngc:'+identity(r.nationalGridBmUnit),bmUnit:r.elexonBmUnit??null,fpnFlag:r.fpnFlag===true,nationalGridBmUnit:r.nationalGridBmUnit??null,technology:typeof r.fuelType==='string'?r.fuelType:null,name:typeof r.bmUnitName==='string'?r.bmUnitName:null,operator:typeof r.leadPartyName==='string'?r.leadPartyName:null,sourcePublishedAt:null,kind:'reference',physicalSiteId:null,mappingConfidence:'unmapped'})));
 }else throw Error('Unsupported dataset');
 if(records.some(r=>r.periodEnd&&Date.parse(r.periodEnd)>now&&dataset!=='BOALF'))throw Error('Uncompleted settlement observations');
 return {schemaVersion:1,definitionVersion:VERSION,parserVersion:dataset+'-v1',dataset,provider:'Elexon',sourceUrl:sourceRequest(dataset,scope),licence:ELEXON_LICENCE,attribution:ATTRIBUTION,scope,geography:'Great Britain',coverage,expectedPeriods:expected,missingPeriods:missing,records,publicationNote:dataset==='BOALF'?'acceptanceTime is an instruction timestamp, not source publication time':'Source creation time retained where published; not retrieval time'};
}
export function mapUnits(reference,mappings){
 const byUnit=new Map();for(const m of mappings){if(m.status!=='verified')continue;for(const unit of m.units||[])byUnit.set(unit,[...(byUnit.get(unit)||[]),m]);}
 return reference.map(r=>{const matches=byUnit.get(r.bmUnit)||[],sites=[...new Set(matches.map(m=>m.id))];const m=matches[0],expected=m?.registryEvidence?.find(e=>e.elexonBmUnit===r.bmUnit);
 const verified=sites.length===1&&m.capacityMW>100&&expected&&expected.bmUnitName===r.name&&expected.leadPartyName===r.operator&&expected.fuelType===r.technology&&r.fpnFlag===true;
 return {...r,physicalSiteId:verified?sites[0]:null,mappingConfidence:verified?'reviewed-existing':sites.length>1?'ambiguous':sites.length?'review-required':'unmapped',mappingCandidates:sites};});
}
export function reconcileVolumes(price,bids,offers,toleranceMWh=0.01){
 const sum=(rows,direction)=>rows.length&&rows.every(r=>r.direction===direction&&r.volumeMWh!==null&&r.periodStart===price.periodStart&&r.sourcePublishedAt===price.sourcePublishedAt)?rows.reduce((a,r)=>a+r.volumeMWh,0):null;
 const bid=sum(bids,'bid'),offer=sum(offers,'offer');const complete=bid!==null&&offer!==null&&price.totalAcceptedBidVolume!==null&&price.totalAcceptedOfferVolume!==null;
 return {status:!complete?'unavailable':Math.abs(bid-price.totalAcceptedBidVolume)<=toleranceMWh&&Math.abs(offer-price.totalAcceptedOfferVolume)<=toleranceMWh?'matched':'mismatch',bidMWh:bid,offerMWh:offer,sourceBidMWh:price.totalAcceptedBidVolume,sourceOfferMWh:price.totalAcceptedOfferVolume,toleranceMWh,note:'Compare only the same settlement period and source creation/run timestamp; not measured generation, curtailment or total balancing cost'};
}
