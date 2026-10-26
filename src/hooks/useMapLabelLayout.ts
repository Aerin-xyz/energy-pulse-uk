import {useLayoutEffect, type RefObject} from 'react';

// Measure rendered labels together, in screen pixels: generation evidence wins
// over background names. Re-run for geometry, fonts, camera and panel changes.
export function useMapLabelLayout(ref: RefObject<SVGSVGElement>) {
 useLayoutEffect(()=>{
  const svg=ref.current;if(!svg)return;
  let frame=0;
  const layout=()=>{
   const canvas=svg.closest('.map-canvas');if(!canvas)return;
   const bounds=canvas.getBoundingClientRect();
   const boxes=Array.from(canvas.querySelectorAll('.network-key, .asset-navigation, .atlas-gesture-hint')).map(e=>e.getBoundingClientRect());
   const labels=Array.from(svg.querySelectorAll<SVGElement>('.asset-marker-caption, .network-station-label'));
   const priority=(e:Element)=>e.closest('[aria-pressed="true"]')?0:e.matches('.asset-marker-caption')?1:2;
   labels.sort((a,b)=>priority(a)-priority(b));
   for(const label of labels){
    label.style.visibility='visible';
    const r=label.getBoundingClientRect();
    if(!r.width||!r.height)continue;
    const inside=r.left>=bounds.left+4&&r.right<=bounds.right-4&&r.top>=bounds.top+4&&r.bottom<=bounds.bottom-4;
    const overlaps=boxes.some(b=>r.left<b.right+5&&r.right>b.left-5&&r.top<b.bottom+5&&r.bottom>b.top-5);
    label.style.visibility=inside&&!overlaps?'visible':'hidden';
    if(inside&&!overlaps)boxes.push(r);
   }
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);};
  layout();
  const mutation=new MutationObserver(schedule);mutation.observe(svg,{childList:true,subtree:true,characterData:true});
  const resize=new ResizeObserver(schedule);resize.observe(svg);
  document.fonts.addEventListener('loadingdone',schedule);
  const canvas=svg.closest('.map-canvas');canvas?.addEventListener('toggle',schedule,true);
  return()=>{canvas?.removeEventListener('toggle',schedule,true);cancelAnimationFrame(frame);mutation.disconnect();resize.disconnect();document.fonts.removeEventListener('loadingdone',schedule);};
 });
}
