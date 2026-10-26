import {carbonPresentation} from '@/lib/evidence/carbon.mjs';
import {FUEL_COLOURS,sourceIndicator} from '@/lib/atlasPresentation.mjs';
import {useGridEvidence} from '@/hooks/useGridEvidence';
import {halfHours,nearLiveGeneration,VERSION} from '@/lib/evidence/calculations.mjs';
import {lazy, Suspense, type ReactNode} from 'react';
import {useLocation, useNavigate, Link} from 'react-router-dom';
import {Zap, Wind, Leaf, Cable} from 'lucide-react';
import {useEnergyData} from '@/contexts/EnergyDataContext';
import {useHistoricalGeneration} from '@/hooks/useHistoricalGeneration';
import {useCarbonOutlook} from '@/hooks/useCarbonOutlook';
import {finite, sourceState} from '@/lib/gridMetrics.mjs';
import {EvidenceExport} from './EvidenceExport';
import '@/styles/national-picture.css';
const GridAtlas=lazy(()=>import('./GridAtlas').then(m=>({default:m.GridAtlas})));
const gw=(v:number|null|undefined)=>finite(v)?(v!/1000).toFixed(1):'—';
const stamp=(v:string|undefined)=>v?new Date(v).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}):'Period unavailable';
export {CommandNavigation} from './CommandNavigation';
export function GridCommandCentre({data,history,carbon,now,children}:{data:ReturnType<typeof useEnergyData>['data'];history:ReturnType<typeof useHistoricalGeneration>;carbon:ReturnType<typeof useCarbonOutlook>;now:number;children?:ReactNode}) {
 const location=useLocation(),navigate=useNavigate();
 const generationMode=new URLSearchParams(location.search).get('basis')==='half-hour'?'half-hour':'near-live';
 const setGenerationMode=(mode:string)=>{const p=new URLSearchParams(location.search);if(mode==='half-hour')p.set('basis',mode);else p.delete('basis');navigate({pathname:location.pathname,search:p.toString(),hash:location.hash},{state:location.state,preventScrollReset:true});};
 const evidence=useGridEvidence();const current=halfHours(evidence.data?.sources.FUELHH?.records||[],evidence.data?.sources.INDO?.records||[],now).at(-1);
 const nearLive=nearLiveGeneration(evidence.data?.sources.FUELINST?.records||[],now);
 const chosen=generationMode==='near-live'?nearLive:current;
 const generationAt=generationMode==='near-live'?nearLive?.observedAt:current?.to;
 const label=generationMode==='near-live'?'Near-live · FUELINST':'Completed half-hour · FUELHH';
 const fuelOrder=['Wind','Nuclear','Gas','Biomass','Other','Hydro','Coal','OCGT','Oil'];
 const mix=fuelOrder.map(name=>(chosen?.generationMix||[]).find(m=>m.name===name)||{name,value:null});
 const complete=finite(chosen?.generationMW);
 const total=chosen?.generationMW;const renewable=finite(total)&&total!>0&&finite(chosen?.renewableMW)?chosen!.renewableMW/total!*100:null;
 const status=sourceIndicator({timestamp:generationAt,cadenceMinutes:generationMode==='near-live'?5:30,now,failed:evidence.isError||evidence.data?.transportStatus==='fallback'||!!evidence.data?.sources[generationMode==='near-live'?'FUELINST':'FUELHH']?.error,available:finite(total)});
 const carbonReading=carbonPresentation(data?.carbonIntensity,now);
 const net=current?.netImportsMW;
 return <><section className="cc-heading national-heading"><h1>Britain’s electricity. <em>Live, explained.</em></h1><p>Great Britain’s electricity: measured generation, sources and forecasts. Northern Ireland is a separate market.</p></section>
 <p className="national-status" data-source-state={status.state}>Generation: {status.label} · {stamp(generationAt)}. Each source has its own clock.</p>
 <div className="national-layout">
 <section className="national-metrics" aria-label="National electricity summary">
 <article><h2><Zap size={16}/>Demand</h2><strong>{gw(current?.demandMW)} <small>GW</small></strong><p>Initial national outturn · INDO</p><small>{stamp(current?.to)} · {sourceState(current?.to,30,now).label}</small></article>
 <article><h2><Wind size={16}/>Renewable share</h2><strong>{finite(renewable)?renewable!.toFixed(1):'—'} <small>%</small></strong><p>Wind, hydro and biomass</p><small>Metered generation · {stamp(generationAt)}</small></article>
 <article><h2><Leaf size={16}/>Carbon intensity</h2><strong>{carbonReading.value} <small>gCO₂/kWh</small></strong><p>{carbonReading.basis} · {carbonReading.interval}</p><small>{carbonReading.freshness}</small></article>
 <article><h2><Cable size={16}/>Net transfers</h2><strong>{finite(net)&&net!>0?'+':''}{gw(net)} <small>GW</small></strong><p>{finite(net)?net!>0?'Net importing':net!<0?'Net exporting':'Balanced':'Unavailable'} · imports − exports</p><small>{stamp(current?.to)} · {sourceState(current?.to,30,now).label}</small></article>
 </section>
 <section className="national-mix" aria-label="Electricity snapshot"><header><h2>Generation mix</h2><span>Great Britain</span></header>
 <div className="atlas-tabs" role="group" aria-label="Generation observation basis"><button aria-pressed={generationMode==='near-live'} onClick={()=>setGenerationMode('near-live')}>Near-live · 5 min</button><button aria-pressed={generationMode==='half-hour'} onClick={()=>setGenerationMode('half-hour')}>Completed half-hour</button></div>
 <p className="national-total"><strong>{gw(total)} <small>GW</small></strong><span>{label}<br/>{stamp(generationAt)}</span></p>
 <div className="map-mix-strip" aria-hidden="true">{mix.map(m=><i key={m.name} style={{width:total&&finite(m.value)?m.value!/total*100+'%':'0',background:FUEL_COLOURS[m.name]||'#94a3b8'}}/>)}</div>
 <ul className="national-fuels" aria-label="Generation by fuel">{mix.map(m=><li key={m.name}><span><i style={{background:FUEL_COLOURS[m.name]||'#94a3b8'}}/>{m.name}</span><strong>{gw(m.value)} <small>GW</small></strong><b>{finite(total)&&total!>0&&finite(m.value)?(m.value!/total!*100).toFixed(1)+'%':'—'}</b></li>)}</ul>
 {chosen&&!complete&&<p>Partial fuel coverage — total and shares withheld. Missing readings remain unknown.</p>}
 {!chosen&&<p>Generation readings unavailable. No values inferred.</p>}
 <details><summary>Coverage &amp; definitions</summary><p>Transmission-metered domestic generation excludes embedded estimates, pumped storage and imports. Other may include batteries. Renewable share includes wind, natural hydro and biomass, not nuclear; biomass is not zero-emission. {generationMode==='near-live'&&nearLive&&!nearLive.complete?'Incomplete fuel coverage — total withheld.':''}</p><p>Demand and carbon use separate intervals. Five-minute snapshots are not half-hour averages. <Link to="/methodology/">Methods and source definitions</Link></p><p>{carbonReading.forecast}</p></details>
 <EvidenceExport title="Great Britain generation mix" at={generationMode==='half-hour'?current?.from:generationAt} periodEnd={generationMode==='half-hour'?current?.to:undefined} definitionVersion={VERSION} kind="measured" basis={label+'; transmission-metered domestic generation; excludes embedded estimates, pumped storage and imports'} status={complete?status.label:status.label+'; partial fuel coverage; total withheld'} rows={(chosen?.generationMix||[]).map(m=>({name:m.name,value:m.value,unit:'MW'}))} sourceUrl="https://bmrs.elexon.co.uk/api-documentation"/>
 </section>
 <div className="national-context">{children}</div>
 <section className="national-atlas" aria-label="Explore the electricity atlas">
 <Suspense fallback={<p className="atlas-load-state">Loading the electricity atlas… National readings remain available above.</p>}><GridAtlas flows={data?.interconnectors||[]} regions={carbon.regions} regionFrom={carbon.from} regionTo={carbon.to} flowTime={data?.dataFreshness?.sourceFreshness?.interconnectors?.timestamp||undefined} now={now}/></Suspense>
 </section>
 </div></>;
}
