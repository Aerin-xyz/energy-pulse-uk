import {test,expect} from '@playwright/test';
const paths=['/uk-electricity-mix','/uk-wind-power-today/','/uk-solar-power-today/','/interconnectors/','/carbon-intensity-today/'];
for(const width of [390,1366])test(`existing answer layouts ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of paths){await page.goto(path);await expect(page.getByRole('heading',{level:1})).toBeVisible();await page.waitForTimeout(500);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`docs/aeo/${width}-${path.split('/').filter(Boolean)[0]}.png`});}
 expect(errors).toEqual([]);
});
test('request-time answer survives browser startup before API response',async({page})=>{
 await page.route('**/api/energy-data',r=>r.abort());await page.goto('/uk-wind-power-today/');
 const seed=await page.locator('#initial-answer-evidence').textContent();expect(seed).toBeTruthy();const a=JSON.parse(seed!).answer;
 await expect(page.locator('section[data-evidence-schema]')).toContainText(a.text);
});
test('without JavaScript answers and citations remain readable',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 for(const path of paths){await page.goto('http://127.0.0.1:4196'+path);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.locator('section[data-evidence-schema]')).toContainText('Great Britain');await expect(page.locator('section[data-evidence-schema] a').first()).toHaveAttribute('href',/^https:\/\//);}
 await page.goto('http://127.0.0.1:4196/uk-wind-power-today/');expect(await page.locator('body').textContent()).not.toContain('Embedded solar:');
 await context.close();
});
