import {test,expect} from '@playwright/test';
for(const width of [360,390,430,768,1366,1920])test(`compact context, forecast inspection and gutters ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-09-29T22:45:00Z')});
 const periods=Array.from({length:12},(_,i)=>({from:new Date(Date.parse('2026-09-29T23:00:00Z')+i*1800000).toISOString(),to:new Date(Date.parse('2026-09-29T23:00:00Z')+(i+1)*1800000).toISOString(),intensity:{forecast:50+i}}));
 await page.route('**/api.carbonintensity.org.uk/intensity/**',r=>r.fulfill({json:{data:periods}}));
 await page.goto('/');const context=page.locator('.home-context');await context.scrollIntoViewIfNeeded();await expect(context.getByRole('heading',{name:'Lowest-carbon 2-hour window'})).toBeVisible();await expect(context.locator('.home-window')).toContainText('30 Sept');
 await context.getByLabel('Duration',{exact:true}).selectOption('180');await expect(context.getByRole('heading',{name:'Lowest-carbon 3-hour window'})).toBeVisible();await context.getByLabel('Inspect a half-hour').selectOption(periods[3].from);await expect(context.locator('output')).toContainText('53 gCO₂/kWh');
 await expect(context.locator('.home-signal')).toHaveCount(3);await expect(page.getByText('The weather does real work.',{exact:true})).toHaveCount(0);
 const bounds=await context.locator('.home-outlook').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await context.getByText('Forecast evidence',{exact:true}).click();await expect(context.getByRole('table')).toContainText('30 Sept');
});
