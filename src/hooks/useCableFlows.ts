import {useGridEvidence} from './useGridEvidence';
export type CableRow={fuelType:string;generation:number;startTime:string;publishTime:string};
export function useCableFlows(){
 const feed=useGridEvidence();const source=feed.data?.sources.FUELINST;
 return {rows:(source?.records||[]).filter(r=>typeof r.fuelType==='string'&&r.fuelType.startsWith('INT')) as CableRow[],error:feed.isError||!!source?.error,retrievedAt:source?.checkedAt||null};
}
