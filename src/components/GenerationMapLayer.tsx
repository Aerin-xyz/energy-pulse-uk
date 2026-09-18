import {useEffect,useState} from 'react';
import assets from '@/data/atlas/canonical-assets.json';
import './generation-map.css';
export {assets};
const colours:Record<string,string>={'Offshore wind':'#39d9ef','Onshore wind':'#54dfb1',Nuclear:'#b5a1ff',Biomass:'#b2e378',Gas:'#ffbc73','Pumped storage':'#7aa9ff'};
type Reading={mw:number|null;coverage:number;total:number};
type Point={from:string;to:string;values:Record<string,Reading>};
export type AssetSnapshot={checkedAt:string|null;verificationCheckedAt?:string;refreshError?:string;points:Point[]};
export const assetTime=(iso:string)=>new Date(iso).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function useAssetSnapshot(enabled:boolean){
 const [snapshot,setSnapshot]=useState<AssetSnapshot>({checkedAt:null,points:[]});const [error,setError]=useState(false);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();fetch('/data/generation-assets.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{if(!Array.isArray(j.points))throw Error();setSnapshot(j);setError(false)}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[enabled]);
 return {snapshot,error};
}
export function matchingAssets(filter:string,search:string,pilotOnly=false){
 const q=search.trim().toLocaleLowerCase();
 return assets.filter(a=>(!pilotOnly||a.releaseSelection)&&(filter==='All'||a.type===filter)&&(!q||`${a.name} ${a.type} ${a.country}`.toLocaleLowerCase().includes(q)));
}
export function GenerationMapLayer({filter,search,pilotOnly,selected,onSelect,snapshot}:{filter:string;search:string;pilotOnly:boolean;selected:string|null;onSelect:(id:string)=>void;snapshot:AssetSnapshot}){
 const visible=matchingAssets(filter,search,pilotOnly);
 const clusters:{x:number;y:number;members:typeof assets}[]=[];
 for(const asset of visible){
  const x=(asset.longitude+12)*40,y=(61-asset.latitude)*63;
  const nearby=clusters.find(c=>Math.hypot(c.x-x,c.y-y)<18);
  if(nearby){nearby.members.push(asset);nearby.x=nearby.members.reduce((v,a)=>v+(a.longitude+12)*40,0)/nearby.members.length;nearby.y=nearby.members.reduce((v,a)=>v+(61-a.latitude)*63,0)/nearby.members.length}
  else clusters.push({x,y,members:[asset]});
 }
 return <g className="generation-layer">{clusters.map(({x,y,members})=>{
 const grouped=members.length>1;const id=grouped?'cluster:'+members.map(a=>a.id).join(','):members[0].id;
 const a=members.find(a=>a.id===selected)||members[0];const r=snapshot.points.at(-1)?.values[a.id];const mw=a.unitMatch.status==='verified'?r?.mw:null;const known=typeof mw==='number';
 const active=selected===id||members.some(a=>a.id===selected);const radius=grouped?10:known?Math.max(4,Math.min(9,4+Math.sqrt(Math.abs(mw))/10)):4;
 const name=grouped?`${members.length} nearby sites`:a.name;
 return <g key={id} role="button" tabIndex={0} aria-label={grouped?`Inspect ${members.length} nearby generation sites: ${members.map(a=>a.name).join(', ')}`:`Inspect ${a.name} generation`} aria-pressed={active} onClick={()=>onSelect(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(id)}}} style={{color:grouped?'#a2d5ed':colours[a.type]}} className={active||visible.length<=5?'asset-marker labelled':'asset-marker'}>
 <title>{grouped?members.map(a=>a.name).join(' · '):`${a.name} · ${a.installedCapacityMW.toLocaleString('en-GB')} MW installed`}</title>
 {(active||visible.length<=5)&&<rect x={x-13} y={y-18} width="180" height="38" fill="transparent"/>}
 <circle cx={x} cy={y} r={grouped?13:11} fill="transparent"/>
 <circle className="asset-halo" cx={x} cy={y} r={radius+5} fill="currentColor" opacity={active?.3:.1}/>
 <circle cx={x} cy={y} r={radius} fill={grouped?'#102f40':known?'currentColor':'#102834'} stroke="currentColor" strokeWidth="1.5"/>
 {grouped?<text x={x} y={y+3.5} textAnchor="middle" className="asset-count">{members.length}</text>:<circle cx={x} cy={y} r="1.5" fill="#edfaff"/>}
 <g className="asset-marker-caption" pointerEvents="none"><text x={x+15} y={y-3} className="asset-label">{name}</text><text x={x+15} y={y+12} className="asset-value">{grouped?'Select a site':known?`${Math.round(mw).toLocaleString('en-GB')} MW metered`:'Output unavailable'}</text></g>
 </g>})}</g>
}
export function AssetEvidence({id,snapshot,error,onSelect}:{id:string;snapshot:AssetSnapshot;error:boolean;onSelect:(id:string)=>void}){
 if(id.startsWith('cluster:')){
  const ids=id.slice(8).split(',');return <div className="asset-evidence"><span className="asset-kicker">Nearby generation sites</span><h3>Choose a site</h3><p>Grouped for map readability. Each site keeps its own capacity and readings.</p><div className="asset-cluster-list">{assets.filter(a=>ids.includes(a.id)).map(a=><button key={a.id} onClick={()=>onSelect(a.id)}><span>{a.name}<small>{a.type}</small></span><strong>{a.installedCapacityMW.toLocaleString('en-GB')} MW<small>installed</small></strong></button>)}</div></div>
 }

 const asset=assets.find(a=>a.id===id);if(!asset)return null;const latest=snapshot.points.at(-1);const rawReading=latest?.values[id];const r=asset.unitMatch.status==='verified'?rawReading:undefined;const max=Math.max(1,...snapshot.points.map(p=>Math.abs(p.values[id]?.mw??0)));
 return <div className="asset-evidence"><span className="asset-kicker" style={{color:colours[asset.type]}}>{asset.type} · metered history</span><h3>{asset.name}</h3><p className="asset-small">{asset.canonicalId} · Unit match: {asset.unitMatch.status}</p><p className="asset-output">{r?.mw!=null?`${Math.round(r.mw).toLocaleString('en-GB')} MW`:'Output unavailable'}</p>
 {latest&&<p><strong>{assetTime(latest.from)} – {new Date(latest.to).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})} UK</strong><br/>Half-hour average · delayed settlement data, not live.</p>}
 {snapshot.refreshError&&<p>Latest refresh failed. Previously published, dated history is retained; it has not been refreshed.</p>}
 {error&&<p>Snapshot could not be loaded. Geography remains available.</p>}
 <dl><div><dt>Installed site capacity</dt><dd>{asset.installedCapacityMW.toLocaleString('en-GB')} MW</dd></div><div><dt>Metered unit coverage</dt><dd>{asset.units.length ? `${r?.coverage??0} / ${asset.units.length}` : "Not mapped"}</dd></div></dl>
 <p className="asset-small">Installed capacity: DESNZ May 2026 register. This determines the above-500 MW inclusion threshold, not current output or available capacity. {asset.scopeNote} {asset.type==='Pumped storage'?'Storage is not primary generation; signed readings are retained.':''}</p>
 {asset.unitMatch.status!=="verified"&&<p className="asset-small">Catalogue retained for reference. This match is not verified for the focused release; no output is asserted.</p>}
 {asset.mappingNote&&<p className="asset-small">{asset.mappingNote}</p>}
 {asset.unitMatch.status==="verified"&&asset.units.length>0&&snapshot.points.length>0&&<><h4>Published end-of-day sample · six hours</h4><div className="asset-history" aria-hidden="true">{snapshot.points.map(p=>{const v=p.values[id]?.mw;return <span key={p.from} title={`${assetTime(p.from)}: ${v==null?'missing':v.toFixed(1)+' MW'}`} style={{height:v==null?'2px':`${Math.max(2,Math.abs(v)/max*100)}%`,background:v==null?'#57636d':v<0?'#ffa977':colours[asset.type]}}/>})}</div><details><summary>Read observations and unit mapping</summary><ul>{snapshot.points.map(p=><li key={p.from}>{assetTime(p.from)}: {p.values[id]?.mw==null?'Unavailable':`${p.values[id].mw!.toFixed(1)} MW`}</li>)}</ul><p>{asset.units.join(', ')}</p></details></>}
 <p className="asset-small">A site total requires every mapped unit at the same interval. Missing units are not zero. Approximate register location; offshore records may locate a project or connection area, not a surveyed footprint.</p>
 <p className="asset-small">{snapshot.verificationCheckedAt?`Registry checked ${assetTime(snapshot.verificationCheckedAt)} UK.`:'Registry verification time unavailable.'} {snapshot.checkedAt ? `Feed checked ${assetTime(snapshot.checkedAt)} UK. Updated with the daily site refresh.` : "Feed check time unavailable."}</p><div className="asset-sources">{asset.sourceRefs.filter(s=>s.provider==="DESNZ REPD").map(s=><a key={s.id} href={s.url}>REPD #{s.id} ↗</a>)}<a href={asset.capacitySource} target="_blank" rel="noreferrer">DESNZ asset register ↗</a><a href="https://bmrs.elexon.co.uk/actual-generation-output-per-generation-unit" target="_blank" rel="noreferrer">Elexon metered data ↗</a><a href={asset.geographySource} target="_blank" rel="noreferrer">Site geography ↗</a></div>
 </div>
}
