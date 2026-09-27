import {nextBrowserRefresh,releaseSlot} from '../lib/refreshTiming.mjs';
const refreshJitter=Math.random()*30000;
import {useQuery} from '@tanstack/react-query';
export type EvidenceSource={provider:string;datasetId:string;resourceId?:string;kind:string;unit:string;url:string;licence?:string;coverage:string;revision:string;checkedAt:string|null;resourceModifiedAt?:string|null;publishedAt?:string|null;providerSchedule?:string;refreshMinutes:number;error?:string;records:Record<string,unknown>[]};
export type GridEvidence={schemaVersion:number;generatedAt:string;transportStatus?:string;sources:Record<string,EvidenceSource>};
export function useGridEvidence(){return useQuery<GridEvidence>({queryKey:['grid-evidence-v1'],queryFn:async({signal})=>{const r=await fetch('/api/grid-evidence?v='+releaseSlot(),{signal});if(!r.ok)throw Error('Evidence snapshot unavailable');const j=await r.json();if(j.schemaVersion!==1||!j.sources)throw Error('Evidence schema unavailable');return j},staleTime:300000,refetchInterval:()=>nextBrowserRefresh(Date.now(),refreshJitter)-Date.now(),refetchIntervalInBackground:false,refetchOnWindowFocus:'always',retry:1})}
