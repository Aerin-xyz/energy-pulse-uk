import { cables, type Cable } from '@/data/atlas/interconnectors';
import { cableReadings, cableLoading } from '@/lib/cableReadings.mjs';
import type { CableRow } from '@/hooks/useCableFlows';
const point=(p:readonly number[])=>[(p[0]+12)*40,(61-p[1])*63];
const cableTime=(at:string|null)=>at?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(new Date(at))+' UK':'Time unavailable';
export function CableMapLayer({rows,now,selected,select}:{rows:CableRow[];now:number;selected:string|null;select:(id:string)=>void}) {
 return <g className="cable-map-layer">{cables.map(c=>{
 const r=cableReadings(rows,c.code,now);const [x,y]=point(c.gb),[tx,ty]=point(c.other);const [bx,by]=c.label;
 const bend=c.id==='eleclink'?-12:c.id==='ifa'?12:0;
 const d=`M ${x} ${y} Q ${(x+tx)/2+bend} ${(y+ty)/2-8} ${tx} ${ty}`;
 const color=r.mw===null?'#788da0':r.mw>0?'#34f5cb':r.mw<0?'#bb9bff':'#abc4d5';const moving=r.freshness.fresh&&r.mw!==null&&r.mw!==0;
 return <g key={c.id} className={`cable-path ${selected===c.id?'selected':''} ${r.freshness.fresh?'fresh':'delayed'}`} style={{'--cable-color':color} as React.CSSProperties}>
 <g role="button" tabIndex={0} aria-label={`Inspect ${c.name} cable`} onClick={()=>select(c.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(c.id)}}}>
 <path d={d} stroke="transparent" strokeWidth="16" fill="none"/>
 <path d={d} className="cable-wire" stroke={color} strokeWidth={r.mw===null?1:1+Math.min(Math.abs(r.mw),2200)/500} fill="none"/>
 {[point(c.gb),point(c.other)].map(([px,py],i)=><circle key={i} cx={px} cy={py} r="3" fill={color}/>)}
 {moving&&[0,1].map(i=><circle key={i} r="3" fill="#eaffff" className="atlas-traveller"><animateMotion dur="5s" begin={`${-i*2.5}s`} repeatCount="indefinite" path={d} keyPoints={r.mw>0?'1;0':'0;1'} keyTimes="0;1" calcMode="linear"/></circle>)}
 <line x1={(x+tx)/2} y1={(y+ty)/2} x2={bx+57} y2={by+20} className="cable-label-leader"/>
 <rect x={bx} y={by} width="128" height="49" rx="5" className="cable-label-bg"/>
 <text x={bx+7} y={by+13} className="cable-label-name">{c.name}</text>
 <text x={bx+7} y={by+29} className="cable-label-value" fill={color}>{r.mw===null?'Unavailable':`${Math.abs(r.mw).toLocaleString('en-GB')} MW ${r.mw>0?'→ GB':r.mw<0?'← GB':'· zero'}`}</text>
 <text x={bx+7} y={by+42} className="cable-label-time">{r.at?`${cableTime(r.at)}${r.freshness.fresh?'':' · delayed'}`:'No cable reading'}</text>
 </g></g>
 })}</g>
}
export function CableEvidence({cable,rows,now,error}:{cable:Cable;rows:CableRow[];now:number;error:boolean}) {
 const r=cableReadings(rows,cable.code,now);const loading=cableLoading(r.mw,cable.capacity);
 const max=Math.max(cable.capacity,...r.history.map((x:CableRow)=>Math.abs(x.generation)));
 const start=r.history.length?Date.parse(r.history[0].startTime):now;
 const end=r.history.length?Date.parse(r.history.at(-1).startTime):now;
 return <><h3>{cable.name} <span className="cable-country">{cable.country}</span></h3><p className="cable-detail-number">{r.mw===null?'Reading unavailable':`${Math.abs(r.mw).toLocaleString('en-GB')} MW · ${r.mw>0?'importing to GB':r.mw<0?'exporting from GB':'zero measured flow'}`}</p><p>{cable.ends[0]} ↔ {cable.ends[1]}</p><dl className="cable-facts"><div><dt>Observed</dt><dd>{r.at ? new Date(r.at).toLocaleString("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})+" UK" : "Time unavailable"} · {r.freshness.label}</dd></div><div><dt>Nominal capacity</dt><dd>{cable.capacity.toLocaleString('en-GB')} MW</dd></div><div><dt>Flow / nominal capacity</dt><dd>{loading===null?'—':`${loading.toFixed(1)}%`}{loading!==null&&loading>100?' · exceeds nominal rating':''}</dd></div></dl><small>Nominal rating is not currently available trading capacity. Readings are not outage declarations.</small>
 {r.history.length>1&&<><svg className="cable-history" viewBox="0 0 400 95" role="img" aria-label={`${cable.name} six-hour available flow history, above zero imports and below zero exports`}><line x1="0" y1="45" x2="400" y2="45" stroke="#496574" strokeDasharray="3 3"/>{r.history.map((p:CableRow,i:number)=>{const x=(Date.parse(p.startTime)-start)/Math.max(1,end-start)*396;const h=Math.abs(p.generation)/max*39;return <rect key={i} x={x} y={p.generation>=0?45-h:45} width="2" height={Math.max(.6,h)} fill={p.generation>=0?'#35e5c5':'#b69aff'}/>})}<text x="0" y="92" fill="#a7bccb" fontSize="10">{cableTime(r.history[0].startTime)}</text><text x="400" y="92" textAnchor="end" fill="#a7bccb" fontSize="10">{cableTime(r.at)}</text></svg><small>Available observations from the last six hours · gaps are not filled. Above zero: imports; below: exports.</small><details><summary>Read the observations</summary><div className="cable-observations"><table><thead><tr><th>Time (UK)</th><th>MW into GB</th></tr></thead><tbody>{r.history.map((p:CableRow)=><tr key={p.startTime}><td>{cableTime(p.startTime)}</td><td>{p.generation}</td></tr>)}</tbody></table></div></details></>}
 <small>{error?'Refresh unavailable; retaining original observation times. ':''}Elexon Insights · FUELINST / {cable.code} · five-minute MW readings. Positive means import to GB. Published {cableTime(r.publishedAt)}. This feed is separate from the older country totals elsewhere on the page.</small><small>Terminal-area markers are approximate; joining lines are schematic, not surveyed routes. <a href={cable.source} target="_blank" rel="noreferrer">Operator information ↗</a> · <a href={`https://en.wikipedia.org/wiki/${({ifa:"HVDC_Cross-Channel",ifa2:"IFA-2",eleclink:"ElecLink",britned:"BritNed",nemo:"Nemo_Link",nsl:"North_Sea_Link",viking:"Viking_Link",ewic:"East%E2%80%93West_Interconnector",moyle:"Moyle_Interconnector",greenlink:"Greenlink"})[cable.id]}`} target="_blank" rel="noreferrer">Geography reference ↗</a> · <a href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELINST" target="_blank" rel="noreferrer">Data documentation ↗</a></small></>
}
