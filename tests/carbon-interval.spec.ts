import {test,expect} from '@playwright/test';import fs from 'node:fs';
const seed=JSON.parse(fs.readFileSync('tests/fixtures/grid-snapshot.json','utf8'));
for(const width of [390,1366])test(`carbon interval, explicit forecast and retained state ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-09-28T11:37:00Z')});
 let carbon={schemaVersion:2,actual:143 as number|null,forecast:142,index:'moderate',timestamp:'2026-09-28T11:30:00Z',intervalFrom:'2026-09-28T11:00:00Z',intervalTo:'2026-09-28T11:30:00Z',fetchedAt:'2026-09-28T11:36:05Z',status:'ok',basis:'actual'};
 await page.route('**/api/energy-data',r=>r.fulfill({json:{...seed,carbonIntensity:carbon}}));await page.goto('/');const summary=page.locator('.map-summary-reading').filter({hasText:'Carbon intensity'});
 await expect(summary).toContainText('143');await expect(summary).toContainText('Reported actual');await expect(summary).toContainText('12:00–12:30 UK');await expect(summary).toContainText('7m since interval ended');await expect(summary).toContainText('Forecast 142');
 carbon={...carbon,actual:null,basis:'forecast-only'};await page.reload();await expect(summary.locator('strong')).toContainText('—');await expect(summary).toContainText('Actual unavailable');await expect(summary).toContainText('Forecast 142');
 carbon={...carbon,actual:143,basis:'actual',status:'retained'};await page.reload();await expect(summary).toContainText('Refresh unavailable · retained interval');await expect(summary).toContainText('12:00–12:30 UK');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
