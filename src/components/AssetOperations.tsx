import {useQuery} from '@tanstack/react-query';
import {scheduledSite} from '@/lib/assetExplorer.mjs';
export function useAssetOperations(enabled=true){ return useQuery({queryKey:['asset-operations'],enabled,queryFn:async()=>{const r=await fetch('/data/asset-operations.json');if(!r.ok)throw Error('Unavailable');return r.json()},staleTime:60000,refetchInterval:60000,retry:1});
}
export function AssetOperations({units,verified}:{units:string[];verified:boolean}){
 const query=useAssetOperations(verified);
 if(!verified)return null;
 const data=query.data,reading=scheduledSite(data?.records||[],units,data?.from,data?.to),expired=!data?.to||Date.parse(data.to)<=Date.now();
 const time=(s:string)=>new Date(s).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 return <section className="asset-operations" aria-label="Notified operational schedule"><span className="asset-kicker">SCHEDULED · NOT MEASURED</span><h4>Notified operating plan</h4><strong>{reading.mw===null?'Unavailable':`${reading.mw.toLocaleString('en-GB',{maximumFractionDigits:0})} MW`}</strong><p>{data?.from?`${time(data.from)} – ${time(data.to)} UK · half-hour average`:'Schedule interval unavailable'}. {expired?'Past notification; not a current schedule.':'Current-period notification, not live telemetry.'}</p><p>This is what units notified they planned to produce. It is not measured output; differences cannot establish curtailment.</p>{(query.isError||data?.error)&&<p>Refresh unavailable. Any retained notification keeps its original period.</p>}<details><summary>Schedule coverage and source</summary><p>{reading.coverage} / {reading.total} units with a complete, unambiguous interval. All units are required for a site total.</p><p>Retrieved: {data?.checkedAt?time(data.checkedAt):'Unavailable'} UK. Row publication time not supplied.</p><a href={data?.url||'https://bmrs.elexon.co.uk/physical-notifications'}>Elexon PN source ↗</a><p className="asset-revision">Revision: {data?.revision||'Unavailable'}</p></details></section>
}
