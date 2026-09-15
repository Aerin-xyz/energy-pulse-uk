import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const snapshot=JSON.parse(readFileSync(new URL('./fixtures/grid-snapshot.json',import.meta.url),'utf8'));
const routes=['/explore','/wholesale-electricity-price','/pumped-storage','/about','/data','/insights','/newsletter','/methodology','/contact','/privacy','/citation','/uk-electricity-mix','/carbon-intensity','/renewables','/gas-generation','/nuclear-power','/interconnectors','/electricity-demand','/uk-electricity-generation-live','/cleanest-time-to-use-electricity','/uk-wind-power-today','/uk-solar-power-today','/gas-share-of-electricity','/renewables-share-today','/carbon-intensity-today','/today','/yesterday','/power-flow','/reports','/reports/weekly/2026-05-11','/records','/records/highest-renewable-share','/records/highest-wind-generation','/records/highest-solar-generation','/records/highest-gas-generation','/social','/measurement','/glossary','/partners','/missing-page'];
test.beforeEach(async({page})=>{
 await page.route('**/functions/v1/energy-data?**',r=>r.fulfill({json:snapshot}));
 await page.route('**/functions/v1/historical-generation',r=>r.fulfill({json:{data:[],totalPeriods:0,meta:{periods:0}}}));
 await page.route('**/api.carbonintensity.org.uk/**',r=>r.fulfill({json:{data:[]}}));
 await page.route('**/groot.mailerlite.com/**',r=>r.abort());
 await page.route('**/www.google.com/recaptcha/**',r=>r.abort());
});
for(const width of [390,1440])test(`public route family navigation and layout at ${width}px`,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:1000});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes){
  await page.goto(route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.site-page h1').first(),route).toBeVisible();
  await expect(page.locator('.cc-topbar'),route).toHaveCount(1);
  await expect(page.locator('.site-footer'),route).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),route).toBeLessThanOrEqual(width);
 }
 expect(errors).toEqual([]);
});
test('interior navigation, active state and keyboard skip link work',async({page})=>{
 await page.goto('/reports');
 await expect(page.locator('.cc-sidebar a[aria-current=page]')).toHaveText('Reports');
 await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('#site-content')).toBeFocused();
 await page.locator('.cc-sidebar').getByRole('link',{name:'Storage',exact:true}).click();
 await expect(page.locator('.site-system')).toHaveAttribute('data-tone','violet');
 await expect(page.locator('.cc-sidebar a[aria-current=page]')).toHaveText('Storage');
});

test('legacy HTML addresses resolve to the styled explainer',async({page})=>{
 for(const path of ['/uk-electricity-mix.html','/uk-renewable-electricity.html','/uk-wind-generation-live','/uk-electricity-carbon-intensity.html','/uk-electricity-imports-exports.html']){
  await page.goto(path);await expect(page.locator('.site-page h1')).toBeVisible();
  await expect(page.locator('.site-page h1')).not.toContainText('not in the archive');
 }
});
test('crawlable reading pages retain the design without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
 for(const path of ['/reports/weekly/2026-05-11/','/uk-electricity-mix','/ai/uk-electricity-mix/']){
  await page.goto('http://127.0.0.1:4173'+path);await expect(page.locator('.cc-topbar')).toBeVisible();await expect(page.locator('h1').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 }
 await context.close();
});
