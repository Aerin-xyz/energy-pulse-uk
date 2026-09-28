import {test,expect} from '@playwright/test';
const fuels=['BIOMASS','CCGT','COAL','NPSHYD','NUCLEAR','OCGT','OIL','OTHER','WIND'];
for(const width of [360,390,430,1366])test(`original brand and open generation mix ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-09-28T11:10:00Z')});
 await page.route('**/api/grid-evidence*',r=>r.fulfill({json:{schemaVersion:1,sources:{FUELINST:{records:fuels.map(fuelType=>({fuelType,generation:1000,startTime:'2026-09-28T11:05:00Z',publishTime:'2026-09-28T11:06:00Z'}))},FUELHH:{records:[]},INDO:{records:[]}}}}));
 await page.goto('/');await expect(page.locator('.cc-original-logo svg circle')).toHaveCount(136);
 const mix=page.getByRole('region',{name:'Electricity snapshot'});await expect(mix.getByRole('heading',{name:'Generation mix',exact:true})).toBeVisible();await expect(mix.locator('.map-mix-legend li')).toHaveCount(9);await expect(mix.locator('.map-mix-legend li').first()).toContainText('1.0 GW');await expect(mix.locator('.map-mix-legend li').first()).toContainText('11%');await expect(mix.locator('details')).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 const original=await page.locator('.cc-original-logo circle').first().getAttribute('fill');await page.clock.runFor(6500);expect(await page.locator('.cc-original-logo circle').first().getAttribute('fill')).not.toBe(original);
 await page.getByRole('button',{name:'Pause ambient motion',exact:true}).click();const paused=await page.locator('.cc-original-logo circle').first().getAttribute('fill');await page.clock.fastForward(15000);expect(await page.locator('.cc-original-logo circle').first().getAttribute('fill')).toBe(paused);
});
test('original logo respects reduced motion',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await page.goto('/');const circle=page.locator('.cc-original-logo circle').first();await expect(circle).toBeAttached();const fill=await circle.getAttribute('fill');await page.clock.fastForward(15000);expect(await circle.getAttribute('fill')).toBe(fill);expect(await page.locator('.cc-original-logo svg').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');});
