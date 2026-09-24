import {notificationReading} from '@/lib/notificationFeed.mjs';
import {useGenerationCatalogue} from '@/hooks/useGenerationCatalogue';
import {AssetOperations} from './AssetOperations';
import {assetClusters,filterAssets,capacityText} from '@/lib/assetExplorer.mjs';
import {useEffect,useState} from 'react';
import seedAssets from '@/data/atlas/canonical-assets.json';
import './generation-map.css';

const colours:Record<string,string>={'Offshore wind':'#39d9ef','Onshore wind':'#54dfb1',Nuclear:'#b5a1ff',Biomass:'#b2e378',Gas:'#ffbc73','Pumped storage':'#7aa9ff',Solar:'#f7cf62',Hydro:'#4fbdf3',Biogas:'#9ac881','Energy from waste':'#ec9bbd',Marine:'#53cecd',Geothermal:'#db9c82','Oil / other thermal':'#adb6c3'};
type Reading={mw:number|null;coverage:number;total:number};
type Point={from:string;to:string;values:Record<string,Reading>};
export type AssetSnapshot={checkedAt:string|null;verificationCheckedAt?:string;refreshError?:string;points:Point[]};
export const assetTime=(iso:string)=>new Date(iso).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function useAssetSnapshot(enabled:boolean){
 const [snapshot,setSnapshot]=useState<AssetSnapshot>({checkedAt:null,points:[]});const [error,setError]=useState(false);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();fetch('/data/generation-assets.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{if(!Array.isArray(j.points))throw Error();setSnapshot(j);setError(false)}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[enabled]);
 return {snapshot,error};
}
export function matchingAssets(filter:string,search:string,pilotOnly=false,extra:Record<string,unknown>={}){return filterAssets(extra.assets||seedAssets,{fuel:filter,search,pilotOnly,...extra})}
function TechnologyGlyph({type}:{type:string}){
 const paths:Record<string,string>={
 'Offshore wind':'M0 0V8M0 0L-7 -3M0 0L5 -6M0 0L4 5M-8 9Q-4 6 0 9T8 9',
 Solar:'M-7 -5H7L9 5H-9ZM-3 -5L-4 5M3 -5L4 5M-8 0H8M0 5V9M-4 9H4',
 Hydro:'M0 -9Q-10 2 -5 7Q0 11 5 7Q10 2 0 -9',
 'Onshore wind':'M0 0V9M0 0L-7 -3M0 0L5 -6M0 0L4 5',
 Nuclear:'M-7 0C-7 -6 7 -6 7 0S-7 6 -7 0M0 -7C6 -7 6 7 0 7S-6 -7 0 -7',
 Biomass:'M-6 6Q-9 -5 7 -8Q9 7-6 6M-6 6L3 -3',
 Gas:'M0 -8Q9 0 5 6Q0 11 -5 6Q-9 2 -3 -4L-2 2Z',
 'Pumped storage':'M0 -8Q-10 3 -5 7Q0 12 5 7Q10 3 0 -8M-3 5L0 2L3 5'};
 return <path d={paths[type]||'M-5 -5H5V5H-5Z'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>;
}
export function GenerationMapLayer({filter,search,pilotOnly,selected,onSelect,snapshot,zoom=1,country='All GB',availability='All data',minCapacity=0,viewport,operations}:{filter:string;search:string;pilotOnly:boolean;selected:string|null;onSelect:(id:string)=>void;snapshot:AssetSnapshot;zoom?:number;country?:string;availability?:string;minCapacity?:number;viewport?:{cx:number;cy:number;w:number;h:number};operations?:any}){
 const {assets}=useGenerationCatalogue();
 const visible=matchingAssets(filter,search,pilotOnly,{assets,country,availability,snapshot,minCapacity,operations}).filter(a=>!viewport||Math.abs((a.longitude+12)*40-viewport.cx)<viewport.w/2+30/zoom&&Math.abs((61-a.latitude)*63-viewport.cy)<viewport.h/2+30/zoom);
 const clusters=assetClusters(visible,zoom);const labels=new Set<string>();const boxes:{x:number;y:number;w:number;h:number}[]=[];
 const clusterId=c=>c.members.length>1?'cluster:'+c.members.map(a=>a.id).join(','):c.members[0].id;
 const isActive=c=>selected===clusterId(c)||c.members.some(a=>a.id===selected);
 for(const c of [...clusters].sort((a,b)=>Number(isActive(b))-Number(isActive(a)))){
  if(!isActive(c)&&visible.length>5&&zoom<3)continue;
  const box={x:c.x+24/zoom,y:c.y-18/zoom,w:190/zoom,h:36/zoom};
  const overlaps=boxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y)||clusters.some(o=>o!==c&&o.x>box.x-12/zoom&&o.x<box.x+box.w&&o.y>box.y&&o.y<box.y+box.h);
  if(isActive(c)||!overlaps){labels.add(clusterId(c));boxes.push(box)}
 }
 return <g className="generation-layer">{clusters.map(({x,y,members})=>{
 const grouped=members.length>1,id=grouped?'cluster:'+members.map(a=>a.id).join(','):members[0].id;
 const a=members.find(a=>a.id===selected)||members[0],r=snapshot.points.at(-1)?.values[a.id];const n=notificationReading(a,operations);const notified=n.current&&n.mw!==null;const mw=notified?n.mw:a.unitMatch.status==='verified'?r?.mw:null,known=typeof mw==='number';
 const active=selected===id||members.some(a=>a.id===selected),name=grouped?`${members.length} nearby sites`:a.name;
 const radius=grouped?(zoom<2?5:14):known?Math.max(12,Math.min(18,12+Math.sqrt(Math.abs(mw))/12)):12;
 return <g key={id} transform={`translate(${x} ${y}) scale(${1/zoom})`} role="button" tabIndex={0} aria-label={grouped?`Inspect ${members.length} nearby generation sites: ${members.slice(0,5).map(a=>a.name).join(', ')+(members.length>5?` and ${members.length-5} more`:'')}`:`Inspect ${a.name} generation`} aria-pressed={active} onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id)}}} style={{color:grouped?'#e6bd62':colours[a.type]}} className={(labels.has(id)?'asset-marker labelled':'asset-marker')+(grouped&&zoom<2?' compact-cluster':'')}>
 <title>{grouped?members.map(a=>a.name).join(' · '):`${a.name} · ${capacityText(a.installedCapacityMW)} installed`}</title>
 {labels.has(id)&&<rect x="-22" y="-24" width="220" height="48" fill="transparent"/>}
 <circle r="22" fill="transparent"/>
 <circle className="asset-halo" r={radius+7} fill="currentColor" opacity={active?.3:.08}/>
 <circle r={radius} fill="#071e2a" stroke="currentColor" strokeWidth={known?1.5:1} strokeDasharray={!known&&!grouped?'2 3':undefined}/>
 {grouped?<text y="4" textAnchor="middle" className="asset-count">{members.length}</text>:<TechnologyGlyph type={a.type}/>}
 <g className="asset-marker-caption" pointerEvents="none"><text x="24" y="-3" className="asset-label">{name}</text><text x="24" y="12" className="asset-value">{grouped?'Select or zoom in':known?`${Math.round(mw).toLocaleString('en-GB')} MW · ${notified?'notified':'dated'}`:'Capacity only · no output'}</text></g>
 </g>})}</g>
}
export function AssetEvidence({id,snapshot,error,onSelect}:{id:string;snapshot:AssetSnapshot;error:boolean;onSelect:(id:string)=>void}){
 const {assets}=useGenerationCatalogue();
 if(id.startsWith('cluster:')){
  const ids=id.slice(8).split(',');return <div className="asset-evidence"><span className="asset-kicker">Nearby generation sites</span><h3>Choose a site</h3><p>Grouped for map readability. Each site keeps its own capacity and readings.</p><div className="asset-cluster-list">{assets.filter(a=>ids.includes(a.id)).map(a=><button key={a.id} onClick={()=>onSelect(a.id)}><span>{a.name}<small>{a.type}</small></span><strong>{capacityText(a.installedCapacityMW)}<small>installed</small></strong></button>)}</div></div>
 }

 const asset=assets.find(a=>a.id===id);if(!asset)return null;const latest=snapshot.points.at(-1);const rawReading=latest?.values[id];const r=asset.unitMatch.status==='verified'?rawReading:undefined;const max=Math.max(1,...snapshot.points.map(p=>Math.abs(p.values[id]?.mw??0)));
 return <div className="asset-evidence"><span className="asset-kicker" style={{color:colours[asset.type]}}>{asset.type} · {asset.unitMatch.status==='verified'?'metered history':'generation evidence'}</span><h3>{asset.name}</h3><p className="asset-location">{asset.country} · {asset.latitude.toFixed(3)}° N, {Math.abs(asset.longitude).toFixed(3)}° {asset.longitude<0?'W':'E'}</p><a className="asset-permalink" href={`/?asset=${asset.id}`}>Permanent link to this asset ↗</a><p className="asset-small">{asset.operationalStatus||'Operational in source register'} · {asset.operator||'Operator not supplied'}</p><p className="asset-small">{asset.canonicalId} · Metered unit match: {asset.unitMatch.status}</p><AssetOperations asset={asset}/><h4>Last measured output</h4><p className="asset-output">{r?.mw!=null?`${Math.round(r.mw).toLocaleString('en-GB')} MW`:'Output unavailable'}</p>
 {latest&&asset.unitMatch.status==='verified'&&<p><strong>{assetTime(latest.from)} – {new Date(latest.to).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})} UK</strong><br/>Half-hour average · delayed settlement data, not live.</p>}
 {snapshot.refreshError&&<p>Latest refresh failed. Previously published, dated history is retained; it has not been refreshed.</p>}
 {error&&<p>Snapshot could not be loaded. Geography remains available.</p>}
 <dl><div><dt>Installed site capacity</dt><dd>{capacityText(asset.installedCapacityMW)}</dd></div><div><dt>Measured unit coverage</dt><dd>{asset.units.length ? `${r?.coverage??0} / ${asset.units.length}` : "Not mapped"}</dd></div></dl>
 <p className="asset-small">Installed capacity: {asset.registryAsOf||asset.capacityAsOf}. Not current output or available capacity. {asset.scopeNote} {asset.type==='Pumped storage'?'Storage is not primary generation; signed readings are retained.':''}</p>
 {asset.unitMatch.status!=="verified"&&<p className="asset-small">Location and capacity are available. No verified measured-output history is linked; any notified plan is shown separately. This does not mean the site generates zero.</p>}
 {asset.mappingNote&&<p className="asset-small">{asset.mappingNote}</p>}
 {asset.unitMatch.status==="verified"&&asset.units.length>0&&snapshot.points.length>0&&<><h4>Published end-of-day sample · six hours</h4><div className="asset-history" aria-hidden="true">{snapshot.points.map(p=>{const v=p.values[id]?.mw;return <span key={p.from} title={`${assetTime(p.from)}: ${v==null?'missing':v.toFixed(1)+' MW'}`} style={{height:v==null?'2px':`${Math.max(2,Math.abs(v)/max*100)}%`,background:v==null?'#57636d':v<0?'#ffa977':colours[asset.type]}}/>})}</div><details><summary>Read observations and unit mapping</summary><ul>{snapshot.points.map(p=><li key={p.from}>{assetTime(p.from)}: {p.values[id]?.mw==null?'Unavailable':`${p.values[id].mw!.toFixed(1)} MW`}</li>)}</ul><p>{asset.units.join(', ')}</p></details></>}
 
 <p className="asset-small">A site total requires every mapped unit at the same interval. Missing units are not zero. Approximate register location; offshore records may locate a project or connection area, not a surveyed footprint.</p>
 <p className="asset-small">{asset.unitMatch.status==="verified" && <>{snapshot.verificationCheckedAt?`Registry checked ${assetTime(snapshot.verificationCheckedAt)} UK.`:'Registry verification time unavailable.'} {snapshot.checkedAt ? `Feed checked ${assetTime(snapshot.checkedAt)} UK. Updated by scheduled source ingestion.` : "Feed check time unavailable."}</>}</p><div className="asset-sources">{asset.sourceRefs.filter(s=>s.provider==="DESNZ REPD").map(s=><a key={s.id} href={s.url}>REPD #{s.id} ↗</a>)}<a href={asset.capacitySource} target="_blank" rel="noreferrer">Capacity source ↗</a><a href="https://bmrs.elexon.co.uk/actual-generation-output-per-generation-unit" target="_blank" rel="noreferrer">Elexon metered data ↗</a><a href={asset.geographySource} target="_blank" rel="noreferrer">Site geography ↗</a></div>
 </div>
}
