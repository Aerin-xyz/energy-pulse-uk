import {useEffect,useState} from 'react';
import assets from '@/data/atlas/generation-assets.json';
import './generation-map.css';
export {assets};
const colours:Record<string,string>={'Offshore wind':'#39d9ef','Onshore wind':'#54dfb1',Nuclear:'#b5a1ff',Biomass:'#b2e378',Gas:'#ffbc73','Pumped storage':'#7aa9ff'};
type Reading={mw:number|null;coverage:number;total:number};
type Point={from:string;to:string;values:Record<string,Reading>};
export type AssetSnapshot={checkedAt:string|null;points:Point[]};
export const assetTime=(iso:string)=>new Date(iso).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
export function useAssetSnapshot(enabled:boolean){
 const [snapshot,setSnapshot]=useState<AssetSnapshot>({checkedAt:null,points:[]});const [error,setError]=useState(false);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();fetch('/data/generation-assets.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{if(!Array.isArray(j.points))throw Error();setSnapshot(j);setError(false)}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[enabled]);
 return {snapshot,error};
}
export function GenerationMapLayer({filter,selected,onSelect,snapshot}:{filter:string;selected:string|null;onSelect:(id:string)=>void;snapshot:AssetSnapshot}){
 return <g className="generation-layer">{assets.filter(a=>filter==='All'||a.type===filter).map(a=>{
 const x=(a.longitude+12)*40,y=(61-a.latitude)*63;const r=snapshot.points.at(-1)?.values[a.id];const mw=r?.mw;
 const known=typeof mw==='number';const radius=known?Math.max(5,Math.min(13,5+Math.sqrt(Math.abs(mw))/7)):5;
 const left=['whitelee','dinorwig','torness'].includes(a.id);const tx=x+(left?-17:17);
 return <g key={a.id} role="button" tabIndex={0} aria-label={`Inspect ${a.name} generation`} aria-pressed={selected===a.id} onClick={()=>onSelect(a.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(a.id)}}} style={{color:colours[a.type]}}>
 <rect x={left?x-140:x-22} y={y-22} width="162" height="44" fill="transparent"/>
 <circle className="asset-halo" cx={x} cy={y} r={radius+7} fill="currentColor" opacity={selected===a.id ? .2:.12}/>
 <circle cx={x} cy={y} r={radius} fill={known?'currentColor':'#102834'} stroke="currentColor" strokeWidth="1.5"/>
 <circle cx={x} cy={y} r="2" fill="#edfaff"/>
 <text x={tx} y={y-3} textAnchor={left?'end':'start'} className="asset-label">{a.name}</text>
 <text x={tx} y={y+12} textAnchor={left?'end':'start'} className="asset-value">{known?`${Math.round(mw).toLocaleString('en-GB')} MW`:'No reading'}</text>
 </g>})}</g>
}
export function AssetEvidence({id,snapshot,error}:{id:string;snapshot:AssetSnapshot;error:boolean}){
 const asset=assets.find(a=>a.id===id);if(!asset)return null;const latest=snapshot.points.at(-1);const r=latest?.values[id];const max=Math.max(1,...snapshot.points.map(p=>Math.abs(p.values[id]?.mw??0)));
 return <div className="asset-evidence"><span className="asset-kicker" style={{color:colours[asset.type]}}>{asset.type} · metered history</span><h3>{asset.name}</h3><p className="asset-output">{r?.mw!=null?`${Math.round(r.mw).toLocaleString('en-GB')} MW`:'Output unavailable'}</p>
 {latest&&<p><strong>{assetTime(latest.from)} – {new Date(latest.to).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})} UK</strong><br/>Half-hour average · delayed settlement data, not live.</p>}
 {error&&<p>Snapshot could not be loaded. Geography remains available.</p>}
 <dl><div><dt>Registered unit capacity</dt><dd>{Math.round(asset.registeredCapacityMW).toLocaleString('en-GB')} MW</dd></div><div><dt>Metered unit coverage</dt><dd>{r?.coverage??0} / {asset.units.length}</dd></div></dl>
 <p className="asset-small">Capacity is the sum of selected Elexon BM-unit registrations, not available capacity or a site nameplate rating. {asset.type==='Pumped storage'?'Storage is not primary generation; signed readings are retained.':''}</p>
 {snapshot.points.length>0&&<><h4>Published end-of-day sample · six hours</h4><div className="asset-history" aria-hidden="true">{snapshot.points.map(p=>{const v=p.values[id]?.mw;return <span key={p.from} title={`${assetTime(p.from)}: ${v==null?'missing':v.toFixed(1)+' MW'}`} style={{height:v==null?'2px':`${Math.max(2,Math.abs(v)/max*100)}%`,background:v==null?'#57636d':v<0?'#ffa977':colours[asset.type]}}/>})}</div><details><summary>Read observations and unit mapping</summary><ul>{snapshot.points.map(p=><li key={p.from}>{assetTime(p.from)}: {p.values[id]?.mw==null?'Unavailable':`${p.values[id].mw!.toFixed(1)} MW`}</li>)}</ul><p>{asset.units.join(', ')}</p></details></>}
 <p className="asset-small">A site total requires every mapped unit at the same interval. Missing units are not zero. Approximate site centre; not a turbine or surveyed footprint.</p>
 <p className="asset-small">Registry checked 15 September 2026. {snapshot.checkedAt ? `Feed checked ${assetTime(snapshot.checkedAt)} UK. Updated with the daily site refresh.` : "Feed check time unavailable."}</p><div className="asset-sources"><a href="https://bmrs.elexon.co.uk/actual-generation-output-per-generation-unit" target="_blank" rel="noreferrer">Elexon metered data ↗</a><a href={asset.geographySource} target="_blank" rel="noreferrer">Site geography ↗</a></div>
 </div>
}
