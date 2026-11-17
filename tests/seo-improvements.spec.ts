import {test,expect} from '@playwright/test';
for(const width of [390,1366])test(`design and crawlable evidence ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
 await page.goto('/');await expect(page.locator('.national-atlas')).toBeVisible();
 await expect(page.getByRole('heading',{level:1})).toContainText('Britain’s electricity');
 await page.screenshot({path:`docs/seo-improvements/home-${width}.png`,fullPage:false});
 await page.locator('.citable-evidence summary').click();await expect(page.locator('.citable-evidence')).toContainText('4936620.00 MWh');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto('/network-constraints/');await expect(page.getByRole('heading',{level:1})).toHaveText('Power has to get there.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`docs/seo-improvements/constraints-${width}.png`,fullPage:true});
});
test('query/filter changes do not become custom route pageviews and tracking strips query data',async({page})=>{
 await page.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());await page.goto('/');
 await page.evaluate(()=>{window.dataLayer=[];history.pushState({},'','/?asset=drax&private=secret');dispatchEvent(new PopStateEvent('popstate'))});
 await page.waitForTimeout(300);
 expect(await page.evaluate(()=>window.dataLayer?.filter((x:any)=>x.event==='virtual_page_view').length)).toBe(0);
 const content=await page.evaluate(()=>JSON.stringify(window.dataLayer));expect(content).not.toContain('secret');expect(content).toContain('atlas_asset_view');
});
