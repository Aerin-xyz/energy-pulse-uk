import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommandNavigation } from './CommandNavigation';
import { SiteChromeContext } from './SiteChromeContext';
import { useEnergyData } from '@/contexts/EnergyDataContext';
import '@/styles/command-centre.css';
import '@/styles/site-system.css';
const groups=[
 {label:'Explore the grid',links:[['Live grid','/'],['All charts','/explore'],['Power flow','/power-flow'],['Today','/today'],['Yesterday','/yesterday'],['Records','/records']]},
 {label:'Understand electricity',links:[['The electricity mix','/uk-electricity-mix'],['Carbon intensity','/carbon-intensity'],['Renewables','/renewables'],['Demand','/electricity-demand'],['Gas','/gas-generation'],['Nuclear','/nuclear-power'],['Interconnectors','/interconnectors'],['Glossary','/glossary']]},
 {label:'Follow the evidence',links:[['Reports','/reports'],['Insights','/insights'],['Newsletter','/newsletter'],['Data sources','/data'],['Methodology','/methodology'],['Cite Energy Mix','/citation']]},
 {label:'Energy Mix',links:[['About','/about'],['Contact & corrections','/contact'],['Widgets & partners','/partners'],['Social','/social'],['Measurement','/measurement'],['Privacy','/privacy']]}
];
export function SiteFrame({children}:{children:ReactNode}) {
 const {pathname}=useLocation();const {refetch,loading}=useEnergyData();const [now,setNow]=useState(Date.now());const [motion,setMotion]=useState(true);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(!window.location.hash)window.scrollTo(0,0)},[pathname]);
 // Public share route is a fixed-size export canvas: preserve its framing.
 if(pathname==='/'||pathname.startsWith('/share/'))return <>{children}</>;
 const section=pathname.startsWith('/reports')?'Briefings':pathname.startsWith('/admin')?'Workspace':['/explore','/power-flow','/today','/yesterday'].includes(pathname)?'Explore':pathname.includes('price')?'Markets':pathname.includes('storage')?'Storage':pathname.includes('carbon')||pathname.includes('renewable')?'Clean electricity':'Grid intelligence';
 const tone=section==='Markets'?'amber':section==='Storage'?'violet':section==='Clean electricity'?'mint':'blue';
 return <SiteChromeContext.Provider value={true}><div className="observatory site-system" data-motion={motion?'on':'off'} data-tone={tone}>
 <a className="site-skip" href="#site-content">Skip to content</a>
 <CommandNavigation now={now} refresh={refetch} loading={loading} motion={motion} toggleMotion={()=>setMotion(v=>!v)}/>
 <div className="site-content" id="site-content" tabIndex={-1}><div className="site-section-bar"><Link to="/">Energy Mix</Link><span>/</span><span>{section}</span><Link to="/methodology">Public data. Clear evidence. ↗</Link></div><div className="site-page">{children}</div>
 <footer className="site-footer"><div className="site-footer-intro"><strong>Energy <span>Mix</span></strong><p>Britain’s electricity — live, explained.</p><Link to="/newsletter">Get the weekly current ↗</Link></div><div className="site-footer-links">{groups.map(g=><nav key={g.label} aria-label={g.label}><h2>{g.label}</h2>{g.links.map(([label,to])=><Link key={to} to={to}>{label}</Link>)}</nav>)}</div><small>Contains BMRS data © Elexon Limited {new Date().getFullYear()}. Sources retain their respective terms.</small></footer>
 </div></div></SiteChromeContext.Provider>;
}
