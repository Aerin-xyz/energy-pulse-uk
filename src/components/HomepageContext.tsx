import {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {forecastWindowState, finite, sourceState} from '@/lib/gridMetrics.mjs';
import {londonClock,londonTimestamp} from '@/lib/evidence/timeLabels.mjs';
import '@/styles/homepage-context.css';
const day = (v: string | number) => new Date(v).toLocaleDateString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short'});
const time = (v: string) => londonClock(v, false);
const interval = (from: string,to: string) => `${day(from)} · ${time(from)}–${day(from)===day(to)?'':day(to)+' · '}${time(to)}`;
const gw = (v: number) => finite(v)?(v/1000).toFixed(1):'—';
export function HomepageContext({data,current,carbon,now}: any) {
 const [duration,setDuration]=useState(120),[selected,setSelected]=useState('');
 const outlook=useMemo(()=>forecastWindowState(carbon.periods,duration,now,{error:carbon.forecastError,loading:carbon.loading}),[carbon.periods,carbon.forecastError,carbon.loading,duration,now]);
 const best=outlook.window;
 const upcoming=outlook.periods;
 const inspected=upcoming.find((p:any)=>p.from===selected)||upcoming[0];
 const max=Math.max(1,...upcoming.map((p:any)=>p.intensity.forecast));
 const signals=[
  {name:'Wholesale index',href:'/wholesale-electricity-price',value:finite(data?.marketIndexPrice?.priceGBPPerMWh)?`£${data.marketIndexPrice.priceGBPPerMWh.toFixed(2)}`:'—',unit:'/MWh',note:'Not your retail tariff',at:data?.marketIndexPrice?.startTime},
  {name:'Pumped storage',href:'/pumped-storage',value:gw(current?.storageMW),unit:'GW',note:finite(current?.storageMW)?current.storageMW<0?'Negative metered output':current.storageMW>0?'Positive metered output':'Zero metered output':'Reading unavailable',at:current?.to}
 ];
 return <section className="home-context" aria-label="System readings and carbon outlook">
  <div className="home-readings"><h2>Beyond the mix</h2><p className="home-context-intro">Market and storage</p>
   {signals.map(s=><Link key={s.href} to={s.href} className="home-signal"><span className="home-signal-name">{s.name}<ArrowUpRight size={15}/></span><strong>{s.value} <small>{s.unit}</small></strong><span className="home-signal-note">{s.note}</span><small className="home-signal-time">{sourceState(s.at,30,now).label}</small></Link>)}
  </div>
  <article className="home-outlook" id="outlook"><header><div><p className="home-kicker">Carbon outlook</p><h2>Lowest-carbon {duration/60}-hour window</h2></div><label>Duration<select aria-label="Duration" value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label></header>
   {best?<><strong className="home-window">{interval(best.from,best.to)}</strong><p className="home-window-value"><b>{Math.round(best.intensity)} gCO₂/kWh</b> duration-weighted average · lowest in the available forecast</p></>:<p role="status">{outlook.reason}</p>}
   {outlook.horizon&&<p className="home-forecast-note">Available forecast horizon: {interval(outlook.horizon.from,outlook.horizon.to)}. Gaps are not filled.</p>}
   {upcoming.length>0&&<><div className="home-forecast-bars" aria-hidden="true">{upcoming.map((p:any)=><i key={p.from} className={best&&Date.parse(p.from)>=Date.parse(best.from)&&Date.parse(p.to)<=Date.parse(best.to)?'chosen':''} style={{height:`${Math.max(8,p.intensity.forecast/max*100)}%`}}/>)}</div><div className="home-forecast-axis"><span>{day(upcoming[0].from)} · {time(upcoming[0].from)}</span><span>{day(upcoming.at(-1).to)} · {time(upcoming.at(-1).to)}</span></div><label className="home-forecast-inspect">Inspect a half-hour<select aria-label="Inspect a half-hour" value={inspected.from} onChange={e=>setSelected(e.target.value)}>{upcoming.map((p:any)=><option key={p.from} value={p.from}>{interval(p.from,p.to)}</option>)}</select></label><output aria-live="polite" className="home-forecast-value">{inspected.intensity.forecast} gCO₂/kWh · forecast</output></>}
   <p className="home-forecast-note">Forecast, not a guarantee. Lower carbon does not necessarily mean a lower bill.</p>
   <details><summary>Forecast evidence</summary><p><a href="https://api.carbonintensity.org.uk/">Carbon Intensity API</a> · retrieved {carbon.retrievedAt?londonTimestamp(carbon.retrievedAt):'time unavailable'}. Upstream issue time not supplied.</p><p>Only contiguous future periods covering the selected duration qualify. Rank by duration-weighted average; ties choose the earliest start. No historical lows or actual values substitute for missing forecasts.</p><table><caption>Half-hour forecasts, gCO₂/kWh</caption><tbody>{upcoming.map((p:any)=><tr key={p.from}><th>{interval(p.from,p.to)}</th><td>{p.intensity.forecast}</td></tr>)}</tbody></table></details>
  </article>
 </section>;
}
