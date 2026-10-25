import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const energy=JSON.parse(fs.readFileSync('tests/fixtures/grid-snapshot.json','utf8'));
const now=Date.parse('2026-10-25T00:00:00Z');
const period=(i:number,value=40+i)=>({from:new Date(now+i*1800000).toISOString(),to:new Date(now+(i+1)*1800000).toISOString(),intensity:{forecast:value}});
const regions=Array.from({length:18},(_,i)=>({regionid:i+1,shortname:i===0?'North Scotland':i===14?'England':i===15?'Scotland':i===16?'Wales':i===17?'GB':`Region ${i+1}`,dnoregion:`DNO ${i+1}`,intensity:{forecast:i>=14?0:30+i,index:'low'}}));
async function setup(page:Page){
 await page.clock.setFixedTime(new Date(now-60000));
 await page.route('**/api/energy-data',r=>r.fulfill({json:energy}));
 await page.route('**/api/grid-evidence',r=>r.fulfill({json:{sources:{},generatedAt:new Date(now).toISOString()}}));
 await page.route('**/api.carbonintensity.org.uk/regional',r=>r.fulfill({json:{data:[{from:period(0).from,to:period(0).to,regions}]}}));
 await page.route('**/api.carbonintensity.org.uk/intensity/**',r=>r.fulfill({json:{data:Array.from({length:6},(_,i)=>period(i))}}));
}
test('regional comparison excludes overlapping aggregates, separate country and full-postcode controls work',async({page})=>{
 await setup(page);
 await page.route('**/api.carbonintensity.org.uk/regional/postcode/SW1A',r=>r.fulfill({json:{data:[{shortname:'London',data:[period(0,87)]}]}}));
 await page.goto('/carbon-intensity/');
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Check local carbon intensity',exact:true})});
 const low=panel.locator('div').filter({has:page.getByRole('heading',{name:'Lowest-carbon sub-regions',exact:true})}).last();
 await expect(low.getByRole('listitem').first()).toContainText('North Scotland');
 await expect(panel.getByRole('listitem')).toHaveCount(10);
 await expect(panel.getByRole('listitem').filter({hasText:/^Scotland|^England|^Wales|^GB/})).toHaveCount(0);
 await panel.getByLabel('Country aggregate').selectOption('16');
 await expect(panel).toContainText('Scotland: 0 gCO₂/kWh');
 await panel.getByLabel('UK postcode').fill('SW1A 1AA');
 await panel.getByRole('button',{name:'Check region',exact:true}).click();
 await expect(panel).toContainText('London');await expect(panel).toContainText('87 gCO₂/kWh');
});
test('regional failure ends loading and offers retry without fabricating a rank',async({page})=>{
 await setup(page);await page.route('**/api.carbonintensity.org.uk/regional',r=>r.fulfill({status:503,json:{error:'fixture unavailable'}}));
 await page.goto('/carbon-intensity/');
 await expect(page.getByRole('button',{name:'Retry regional forecasts'})).toBeVisible();
 await expect(page.getByText('Loading regional data…')).toHaveCount(0);
 await expect(page.getByText('Country forecasts unavailable.')).toBeVisible();
});
test('duration controls, horizon, gap and expired forecast states are truthful at mobile width',async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});
 let data=Array.from({length:6},(_,i)=>period(i));
 await page.route('**/api.carbonintensity.org.uk/intensity/**',r=>r.fulfill({json:{data}}));
 await page.goto('/');const panel=page.locator('.home-outlook');
 await expect(panel).toContainText('Available forecast horizon:');
 await panel.getByLabel('Duration',{exact:true}).selectOption('180');
 await expect(panel.locator('.home-window-value')).toContainText('43 gCO₂/kWh');
 await panel.getByLabel('Inspect a half-hour').selectOption(period(2).from);
 await expect(panel.locator('output')).toContainText('42 gCO₂/kWh');
 await expect(panel.getByLabel('Inspect a half-hour').locator('option').nth(0)).toContainText('01:00 BST');
 await expect(panel.getByLabel('Inspect a half-hour').locator('option').nth(2)).toContainText('01:00 GMT');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 data=[period(0),period(2),period(4)];await page.reload();
 await expect(panel.getByText(/No complete future 2-hour window fits/)).toBeVisible();await expect(panel.locator('.home-window')).toHaveCount(0);
 data=[period(-3),period(-2)];await page.reload();
 await expect(panel.getByRole('status')).toContainText('forecast has expired');await expect(panel.locator('.home-window')).toHaveCount(0);
});
test('DST inspector URL selection and frozen download preserve power versus daily energy',async({page})=>{
 await setup(page);
 await page.route('**/api/history*',r=>{
  const daily=r.request().url().includes('7d');
  return r.fulfill({json:{data:Array.from({length:6},(_,i)=>({settlementDate:'2026-10-25',settlementPeriod:i+1,timestamp:new Date(now+i*(daily?86400000:1800000)).toISOString(),fuelMix:[{fuelType:'Wind',mw:daily?240000:10000,percentage:100,color:'#22B8CF'}],totalMW:daily?240000:10000})),lastUpdated:new Date(now).toISOString(),totalPeriods:6,meta:{periods:6,solarMatchedCount:0,totalDays:6,solarMatchedDays:0}}});
 });
 await page.goto('/explore/?historyView=power&historyAt=2026-10-25T01%3A00%3A00.000Z');
 const chart=page.getByRole('tabpanel');
 await chart.getByText('Inspect values without hovering',{exact:true}).click();
 const select=page.getByLabel('Inspect power period');
 await expect(select).toHaveValue('2026-10-25T01:00:00.000Z');
 await expect(select.locator('option').nth(0)).toContainText('01:00 BST (UTC+1)');
 await expect(select.locator('option').nth(2)).toContainText('01:00 GMT (UTC+0)');
 await select.selectOption('2026-10-25T00:30:00.000Z');await expect(page).toHaveURL(/historyAt=2026-10-25T00%3A30%3A00.000Z/);
 await chart.getByText('Cite or download these readings',{exact:true}).click();await chart.getByRole('button',{name:'Freeze selection',exact:true}).click();
 await select.selectOption('2026-10-25T01:00:00.000Z');
 const [download]=await Promise.all([page.waitForEvent('download'),chart.getByRole('button',{name:'JSON evidence'}).click()]);
 const downloaded=JSON.parse(fs.readFileSync((await download.path())!,'utf8'));
 expect(downloaded.at).toBe('2026-10-25T00:30:00.000Z');expect(downloaded.periodEnd).toBe('2026-10-25T01:00:00.000Z');
 expect(downloaded.definitionVersion).toBe('historical-feed-v1');expect(downloaded.rows[0]).toEqual({name:'Wind',value:10,unit:'GW'});
 await page.getByRole('tab',{name:'Daily energy · GWh',exact:true}).click();await expect(page).toHaveURL(/historyView=energy/);
 await page.getByRole('tabpanel').getByText('Inspect values without hovering',{exact:true}).click();
 await expect(page.getByRole('tabpanel').locator('.history-value-tooltip')).toContainText('240.0 GWh');
 await page.getByRole('button',{name:'Reset history view'}).click();await expect(page).not.toHaveURL(/historyAt|historyView/);
});
test('report partial status is in raw HTML and visible before the original figures, dates retained',async({page,request})=>{
 const response=await request.get('/reports/weekly/2026-09-29/');const raw=await response.text();
 expect(raw).toContain('Partial week');expect(raw).toContain('2026-09-23');expect(raw).toContain('2026-09-28');
 await setup(page);await page.goto('/reports/weekly/2026-09-29/');
 const coverage=page.getByRole('complementary',{name:'Report window and coverage'});
 await expect(coverage).toContainText('6 calendar dates');await expect(coverage).toContainText('Originally published 2026-09-29');
 await expect(coverage).toContainText('excluding biomass');await expect(coverage).toContainText('2026-10-25');
 await expect(page.getByRole('heading',{name:'The reporting period in key numbers'})).toBeVisible();
 await expect(page.getByRole('table')).toContainText('40.5%');
});
