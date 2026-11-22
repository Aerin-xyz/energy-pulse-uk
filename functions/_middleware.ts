import {onRequestGet as energyData} from './api/energy-data';
import {answerPaths,answerEvidence,answerMarkup} from '../src/lib/answerEvidence.mjs';
declare const HTMLRewriter:any;
// Only existing answer pages. Same HTML for people and crawlers; no UA branching.
export async function onRequest(context:any){
 const path=new URL(context.request.url).pathname.replace(/\/$/,'');
 if(context.request.method!=='GET'||!(path in answerPaths))return context.next();
 const page=await context.next();
 if(page.status!==200||!page.headers.get('content-type')?.includes('text/html'))return page;
 let data=null;
 try{
  const request=new Request(new URL('/api/energy-data',context.request.url));
  const result=await energyData({...context,request});
  if(result.ok)data=await result.json();
 }catch{/* Preserve explicit unavailable state on source failure. */}
 const answer=answerEvidence(data,path);
 const headers=new Headers(page.headers);headers.set('Cache-Control','private, no-store');headers.delete('ETag');headers.delete('Content-Length');
 const payload=JSON.stringify({path,answer,createdAt:Date.now()}).replace(/</g,'\\u003c');
 return new HTMLRewriter().on('section[data-evidence-schema]',{element(el:any){el.setAttribute('data-evidence-status',answer.status);el.setInnerContent(answerMarkup(answer),{html:true});}}).on('body',{element(el:any){el.append(`<script id="initial-answer-evidence" type="application/json">${payload}</script>`,{html:true});}}).transform(new Response(page.body,{status:page.status,headers}));
}
