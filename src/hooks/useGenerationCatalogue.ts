import {useQuery} from '@tanstack/react-query';
import seedAssets from '@/data/atlas/canonical-assets.json';
export type GenerationAsset=typeof seedAssets[number]&{registryAsOf?:string;operator?:string;recordUpdated?:string;operationalStatus?:string};
export function useGenerationCatalogue(enabled=true){
 const query=useQuery<{schemaVersion:number;assets:GenerationAsset[];metadata:{retrievedAt:string;coverage:string;attribution:string}}>({queryKey:['operational-gb-catalogue'],enabled,queryFn:async({signal})=>{const r=await fetch('/data/operational-assets.json',{signal});if(!r.ok)throw Error('Catalogue unavailable');const j=await r.json();if(j.schemaVersion!==1||!Array.isArray(j.assets)||!j.assets.length)throw Error('Invalid catalogue');return j},staleTime:3600000,retry:1});
 return {...query,assets:(query.data?.assets||seedAssets) as GenerationAsset[]};
}
