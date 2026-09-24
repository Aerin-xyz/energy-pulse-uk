import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const mappings=JSON.parse(fs.readFileSync('src/data/atlas/notification-mappings.json','utf8'));
for(const width of [390,1440])test(`current notified output on solar asset, separate from measured history ${width}`,async({page})=>{
 const m=mappings.entries.find(m=>m.id==='repd-6502')!;const from=new Date(Date.now()-60000).toISOString(),to=new Date(Date.now()+120000).toISOString();
 await page.route('**/api/asset-operations',route=>route.fulfill({json:{schemaVersion:2,from,to,mappings:[m],records:m.units.map(bmUnit=>({dataset:'PN',bmUnit,timeFrom:from,timeTo:to,levelFrom:25,levelTo:25})),checkedAt:from}}));
 await page.setViewportSize({width,height:900});await page.goto('/?asset=repd-6502');const panel=page.getByRole('region',{name:'Selected map evidence'});
 await expect(panel).toContainText('Cleve Hill');await expect(panel).toContainText('Notified output · current half-hour');await expect(panel.locator('.asset-operations strong')).toHaveText('50 MW');await expect(panel).toContainText('Last measured output');await expect(panel.locator('.asset-output')).toHaveText('Output unavailable');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('expired notification stays explicitly past and unmatched site has no invented value',async({page})=>{
 const m=mappings.entries.find(m=>m.id==='drax')!;const from='2026-01-01T00:00:00Z',to='2026-01-01T00:30:00Z';
 await page.route('**/api/asset-operations',route=>route.fulfill({json:{schemaVersion:2,from,to,mappings:[m],records:m.units.map(bmUnit=>({dataset:'PN',bmUnit,timeFrom:from,timeTo:to,levelFrom:0,levelTo:0})),checkedAt:from}}));
 await page.goto('/?asset=drax');await expect(page.locator('.asset-operations')).toContainText('Past notification; not a current schedule.');await expect(page.locator('.asset-operations strong')).toHaveText('0 MW');
 await page.goto('/?asset=seagreen');await expect(page.locator('.asset-operations strong')).toHaveText('Unavailable');
});
