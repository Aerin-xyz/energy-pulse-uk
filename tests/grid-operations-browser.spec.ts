import {gunzipSync}from'node:zlib';import {test,expect}from'@playwright/test';import fs from'node:fs';
const repaired=JSON.parse(gunzipSync(fs.readFileSync('docs/grid-intelligence/phase1-validation/repaired-grid-evidence.json.gz')).toString());
for(const width of [390,1366])test(`repaired costs and expired forecast preserve meaning at ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-26T16:30:00Z')});await page.route('**/api/grid-evidence*',r=>r.fulfill({json:repaired}));
 await page.goto('/network-constraints/');await expect(page.getByText(/No upcoming periods within 48 hours/)).toBeVisible();
 await page.getByText('Source, freshness and revision',{exact:true}).click();await expect(page.locator('.evidence-source')).toContainText('Forecast expired');
 await page.getByRole('button',{name:'Retrospective costs',exact:true}).click();await expect(page.locator('main')).toContainText('2026-10-21');await expect(page.locator('main')).toContainText('not today’s bill');
 const expected=repaired.sources.costs.records.find((r:any)=>r['Settlement Date']==='2026-10-21'&&r['Constraint Group']==='SEIMP');expect(expected['Daily Cost (GBP)']).toBe(6263);
 await expect(page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'SEIMP',exact:true})})).toContainText('6,263');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);
 await page.screenshot({path:`docs/grid-intelligence/phase1-validation/costs-${width}.png`,fullPage:true});
});
