import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
export function useNetworkGeography(){return useQuery({queryKey:['network-geography'],queryFn:async()=>{const r=await fetch('/data/network-geography.json');if(!r.ok)throw Error('Network geography unavailable');return r.json()},staleTime:86400000,retry:1})}
export function NetworkBackdrop({data,zoom=1,showNames=false,markerScale=1}:{data:any;zoom?:number;showNames?:boolean;markerScale?:number}){
 const paths=useMemo(()=>[400000,275000,132000].map(voltage=>({voltage,path:(data?.lines||[]).filter((l:any)=>l.voltage===voltage).map((l:any)=>l.path).join('')})),[data]);
 if(!data)return null;
 return <g className="network-backdrop" aria-label="Mapped transmission infrastructure, not live flows" pointerEvents="none">
 {paths.map((line:any)=><path key={line.voltage} d={line.path} className={'network-line voltage-'+line.voltage} vectorEffect="non-scaling-stroke"><title>Mapped electricity infrastructure · {line.voltage/1000} kV · OpenStreetMap geometry</title></path>)}
 {data.substations.map((s:any)=><g key={s.id} transform={`translate(${s.x} ${s.y})`}><circle r={2*markerScale/zoom} fill="#d9fffa" opacity=".85"/>{showNames&&zoom>4&&s.name&&<text x={5*markerScale/zoom} y={-4*markerScale/zoom} fontSize={12*markerScale/zoom} className="network-station-label" style={{strokeWidth:2*markerScale/zoom}}>{s.name.length>32?s.name.slice(0,31)+'…':s.name}</text>}</g>)}
 </g>
}
