import {test,expect} from '@playwright/test';
const fuels=['BIOMASS','CCGT','COAL','NPSHYD','NUCLEAR','OCGT','OIL','OTHER','WIND'];
const rows=(time:string,value:number)=>fuels.map(fuelType=>({fuelType,generation:value,startTime:time,publishTime:'2026-09-27T17:06:00Z'}));
for(const width of [390,1440])test(`generation modes keep independent timestamps and missing states ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.clock.install({time:new Date('2026-09-27T17:10:00Z')});
 let inst=rows('2026-09-27T17:05:00Z',1000);
 await page.route('**/api/grid-evidence*',r=>r.fulfill({json:{schemaVersion:1,sources:{FUELINST:{records:inst},FUELHH:{records:rows('2026-09-27T16:30:00Z',2000)},INDO:{records:[]}}}}));
 await page.route('**/api/energy-data',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
 await page.route('**/api/history',r=>r.fulfill({json:{data:[]}}));
 await page.goto('/');await expect(page.locator('.map-total')).toContainText('9.0');await expect(page.locator('.map-total')).toContainText('18:05 UK');
 await page.getByRole('button',{name:'Completed half-hour',exact:true}).click();await expect(page.locator('.map-total')).toContainText('18.0');await expect(page.locator('.map-total')).toContainText('18:00 UK');
 await page.getByRole('button',{name:'Near-live · 5 min',exact:true}).click();await expect(page.locator('.map-total')).toContainText('9.0');
 await page.screenshot({path:'/tmp/near-live-local-'+width+'.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await page.clock.fastForward(20*60000);await expect(page.locator('.map-total')).toContainText('Delayed');
 inst=inst.slice(1);await page.reload();await expect(page.locator('.map-total')).toContainText('—');await expect(page.getByRole('region',{name:'Electricity snapshot',exact:true})).toContainText('Incomplete fuel coverage');
 inst=[];await page.reload();await expect(page.locator('.cc-generation')).toContainText('Select completed half-hour');
});
