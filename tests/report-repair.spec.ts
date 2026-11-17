import {test,expect} from '@playwright/test';
for(const width of [390,1366])test(`source-faithful report ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/reports/weekly/2026-11-16/');
 await expect(page.getByRole('heading',{level:1})).toContainText('GB Metered Electricity Generation');
 await expect(page.getByText('7-day reporting window',{exact:false}).first()).toBeVisible();
 await expect(page.getByText('4936620.00 MWh',{exact:true})).toBeVisible();
 await expect(page.getByText('Embedded solar estimate',{exact:true})).toBeVisible();
 await expect(page.getByText(/not included in metered totals/).first()).toBeVisible();
 const evidence=page.getByRole('link',{name:'Checks and source manifest (JSON)'});const response=await page.request.get((await evidence.getAttribute('href'))!);expect(response.status()).toBe(200);const manifest=await response.json();expect(manifest.modules.metered.status).toBe('passed');expect(manifest.days).toHaveLength(7);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:`docs/report-repair/validation/report-${width}.png`,fullPage:true});
 await page.goto('/records/highest-solar-generation/');await expect(page.getByText(/Not metered generation/).first()).toBeVisible();
});
