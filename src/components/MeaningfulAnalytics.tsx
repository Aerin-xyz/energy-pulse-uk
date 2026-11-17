import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {linkMeasurement,routeMeasurement,trackMeasurement} from '@/lib/siteAnalytics.mjs';
export function MeaningfulAnalytics(){
 const {pathname,search}=useLocation();const previous=useRef('');const asset=useRef('');
 useEffect(()=>{if(previous.current!==pathname){previous.current=pathname;trackMeasurement(routeMeasurement(pathname))}},[pathname]);
 useEffect(()=>{const id=new URLSearchParams(search).get('asset')||'';if(id&&id!==asset.current)trackMeasurement({name:'atlas_asset_view',params:{page_path:'/'}});asset.current=id},[search]);
 useEffect(()=>{const click=(event:MouseEvent)=>{const a=(event.target as Element)?.closest?.('a[href]');if(a)trackMeasurement(linkMeasurement(a.getAttribute('href'),window.location.origin))};document.addEventListener('click',click);return()=>document.removeEventListener('click',click)},[]);
 return null;
}
