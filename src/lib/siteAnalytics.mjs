import {canonicalPath} from './initialEvidence.mjs';
export function linkMeasurement(href, origin='https://energymix.info') {
 let url; try{url=new URL(href,origin)}catch{return null}
 if(url.origin===origin && url.pathname.startsWith('/data/validation/reports/'))return {name:'evidence_download',params:{file_path:url.pathname}};
 if(['bmrs.elexon.co.uk','data.elexon.co.uk','www.elexon.co.uk','www.neso.energy','api.neso.energy','carbonintensity.org.uk','api.carbonintensity.org.uk'].includes(url.hostname))return {name:'source_click',params:{source_host:url.hostname}};
 return null;
}
export function routeMeasurement(pathname){
 const page=canonicalPath(pathname);
 return page.startsWith('/reports/weekly/')?{name:'report_view',params:{report_path:page}}:null;
}
export function trackMeasurement(event){
 if(!event||typeof window==='undefined')return;
 window.dataLayer=window.dataLayer||[];
 // Google tag consumes standard gtag command arguments; its existing consent
 // settings apply. No identity, query string, arbitrary URL or form values.
 function command(){window.dataLayer.push(arguments)}
 command('event',event.name,{...event.params,send_to:'G-6C946559GE'});
}
