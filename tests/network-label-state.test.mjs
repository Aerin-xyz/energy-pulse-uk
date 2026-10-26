import {test} from 'node:test';import assert from 'node:assert/strict';import {ATLAS_DEFAULTS,readAtlasState,atlasSearch} from '../src/lib/atlasState.mjs';
test('network labels default off and roundtrip independently of capacity',()=>{
 assert.equal(ATLAS_DEFAULTS.showNetworkNames,false);
 const state={...ATLAS_DEFAULTS,showNetworkNames:true,minCapacity:100};const query=atlasSearch(state);const restored=readAtlasState(query);assert.equal(restored.showNetworkNames,true);assert.equal(restored.minCapacity,100);
 const off=atlasSearch({...restored,showNetworkNames:false},query);assert.equal(new URLSearchParams(off).has('networkNames'),false);assert.equal(readAtlasState(off).showNetworkNames,false);
});
