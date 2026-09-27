import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseSlot,releaseTTL,nextBrowserRefresh} from '../src/lib/refreshTiming.mjs';
test('edge generation changes at shared release, not visitor arrival',()=>{
 assert.equal(releaseSlot(89999),-1);assert.equal(releaseSlot(90000),0);
 assert.equal(releaseTTL(90000),300);assert.equal(releaseTTL(389001),1);
 assert.equal(releaseSlot(390000),1);assert.equal(releaseTTL(390000),300);
});
test('browser follows ingestion and shared edge release; strictly future at boundaries',()=>{
 for(const jitter of [0,15000,30000])for(const now of [0,119999,120000,149999,150000,299999,300000,420000]){
  const next=nextBrowserRefresh(now,jitter);assert(next>now);assert(next-now<=300000);
  assert.equal(next%300000,120000+jitter);assert.equal(releaseSlot(next),Math.floor(next/300000));
 }
});
test('timing remains UTC-based across UK clock changes',()=>{
 for(const date of ['2026-10-25T00:59:59Z','2026-10-25T01:00:00Z','2026-03-29T01:00:00Z']){
  const now=Date.parse(date);assert.equal(nextBrowserRefresh(now)%300000,120000);
 }
});
