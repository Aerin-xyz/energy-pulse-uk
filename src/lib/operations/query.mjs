import {sourceHealth} from './transport.mjs';
export function operationsView(data,now=Date.now()){
 if(data?.schemaVersion!==1||data.definitionVersion!=='gb-operations-v1'||!Array.isArray(data.prices)||!Array.isArray(data.acceptedVolumes)||!Array.isArray(data.instructions))throw Error('Unsupported operations snapshot');
 const view=s=>s?{...s,health:sourceHealth(s,now)}:null;
 return {...data,prices:data.prices.map(view),instructions:data.instructions.map(view),acceptedVolumes:data.acceptedVolumes.map(v=>({...v,bids:view(v.bids),offers:view(v.offers)}))};
}
