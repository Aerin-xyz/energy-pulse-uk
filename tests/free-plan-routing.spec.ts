import {test,expect} from '@playwright/test';
test('static reading routes do not request energy, history or Supabase',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/supabase\.co|\/api\/(energy-data|history|grid-evidence)/.test(r.url()))requests.push(r.url())});
 await page.goto('/about');await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.waitForTimeout(700);expect(requests).toEqual([]);
});
test('one shared refresh cadence and no hidden-tab polling',async({page})=>{
 await page.clock.install({time:new Date('2026-09-27T16:40:00Z')});let calls=0;
 await page.route('**/api/energy-data',r=>{calls++;return r.fulfill({status:503,json:{error:'offline'}})});
 await page.route('**/api/grid-evidence',r=>r.fulfill({json:{schemaVersion:1,sources:{}}}));
 await page.route('**/api/history',r=>r.fulfill({json:{data:[],totalPeriods:0,lastUpdated:'2026-09-27T16:30:00Z'}}));
 await page.goto('/');await expect.poll(()=>calls).toBe(1);
 await page.clock.fastForward(120000);expect(calls).toBe(1);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
 await page.clock.fastForward(600000);expect(calls).toBe(1);
});
