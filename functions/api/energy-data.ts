import {edgeJSON,snapshot} from '../lib/shared-cache';
export async function onRequestGet(context:any){return edgeJSON(context,'energy-data-v4',300,async()=>{const data=await snapshot('public-energy-v1');if(data.definitionVersion!=='gb-evidence-v1')throw Error('Canonical snapshot pending');return data;},true)}
