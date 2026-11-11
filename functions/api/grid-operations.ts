import {edgeJSON,snapshot} from '../lib/shared-cache';
import {operationsView} from '../../src/lib/operations/query.mjs';
export async function onRequestGet(context:any){
 // No route/navigation or public API commitment until the Phase 2 release is reviewed.
 if(context.env.GRID_OPERATIONS_ENABLED!=='true')return Response.json({error:'Not found'},{status:404});
 if(new URL(context.request.url).search)return Response.json({error:'Unsupported query; no upstream proxy'},{status:400});
 return edgeJSON(context,'grid-operations-v1',30,async()=>{const data=await snapshot('public-grid-operations-v1');if(data.schemaVersion!==1||data.definitionVersion!=='gb-operations-v1')throw Error('Unsupported operations schema');return operationsView(data);});
}
