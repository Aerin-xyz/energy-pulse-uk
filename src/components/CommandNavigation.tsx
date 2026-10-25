import {AnimatedLogo} from './AnimatedLogo';
import {AtlasMobileNavigation} from './AtlasMobileNavigation';
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Pause, Play, Activity, BarChart3, BatteryCharging, Cable, Compass, FileText, Globe2, Leaf, Radio, RefreshCw, Search, ShieldCheck, Wind, Zap, BookOpen, Mail } from "lucide-react";
export function CommandNavigation({now,refresh,loading,motion,toggleMotion}:{now:number;refresh:()=>void;loading:boolean;motion:boolean;toggleMotion:()=>void}) {
 const {pathname}=useLocation();
 const path=pathname.replace(/\/$/,"")||"/";
 const active=["/methodology","/citation"].includes(path)?"/data":path.startsWith("/reports")?"/reports":path.includes("carbon")||path==="/renewables"?"/carbon-intensity":path.includes("wind")||path.includes("solar")||path.includes("generation")||path.includes("nuclear")?"/explore":path;
 const navRef=useRef<HTMLElement>(null);
 useEffect(()=>{const nav=navRef.current;const current=nav?.querySelector<HTMLElement>('[aria-current=page]');if(nav&&current&&window.matchMedia('(max-width:600px)').matches)nav.scrollLeft=current.offsetLeft-nav.offsetLeft-8},[pathname]);
 const groups: {name:string;links:[string,string,any][]}[]=[
 {name:'Now',links:[['Live','/',Radio],['Explore','/explore/',Compass],['Reports','/reports/',FileText]]},
 {name:'Understand',links:[['Learn','/uk-electricity-mix',BookOpen],['Carbon','/carbon-intensity/',Leaf],['Demand','/electricity-demand/',Activity],['Connections','/interconnectors/',Cable],['Forecasts','/cleanest-time-to-use-electricity/',Wind]]},
 {name:'Evidence',links:[['Sources','/data/',ShieldCheck],['Methodology','/methodology/',BookOpen],['Storage','/pumped-storage/',BatteryCharging],['Markets','/wholesale-electricity-price/',BarChart3],['Constraints','/network-constraints/',Compass],['Newsletter','/newsletter/',Mail]]}
 ];
 const links=groups.flatMap(g=>g.links);

 return <>{pathname==='/'&&<a className="energy-skip" href="#energy-main">Skip to content</a>}<header className="cc-topbar"><Link className="cc-brand" to="/"><AnimatedLogo className="cc-original-logo" markOnly paused={!motion}/><span>Energy <b>Mix</b><small>THE ELECTRICITY ATLAS</small></span></Link><Link className="cc-search" to="/explore"><Search size={15}/> Explore the grid, sources and insights <span>↗</span></Link><div className="cc-top-status"><span>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'}).format(now)} UK</span><button className="cc-motion-toggle" onClick={toggleMotion} aria-label={motion?"Pause ambient motion":"Enable ambient motion"} aria-pressed={!motion}>{motion?<Pause size={14}/>:<Play size={14}/>}</button><button onClick={refresh} disabled={loading} aria-label="Refresh sources"><RefreshCw size={15}/></button></div></header><aside className="cc-sidebar"><nav ref={navRef} aria-label="Grid navigation">{groups.map(group=><div key={group.name} className="cc-nav-group"><h2>{group.name}</h2>{group.links.map(([name,url,Icon])=><Link key={name} to={url} aria-current={active===(url.replace(/\/$/,'')||'/')?'page':undefined}><Icon size={16}/><span>{name}</span></Link>)}</div>)}</nav><div className="cc-side-art"><Compass size={34}/><p>One island.<br/>Millions of connections.<br/><b>One shared current.</b></p><i/></div></aside><AtlasMobileNavigation links={links}/></>;
}
