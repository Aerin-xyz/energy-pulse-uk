import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`broad operational map and small solar evidence ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();
 const rows=page.locator('.atlas-access-list[data-layer=generation] button');
 await expect(rows).toHaveCount(60);await expect(page.getByText('2,884 operational GB register entries',{exact:false})).toBeVisible();
 expect(await page.locator('.generation-layer [role=button]').count()).toBeLessThan(350);
 expect(await rows.first().evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
 await page.getByRole('button',{name:'Show 60 more results'}).click();await expect(rows).toHaveCount(120);
 await page.getByRole('searchbox',{name:'Find a generation site'}).fill('Fen Farm Solar Park');await expect(rows).toHaveCount(1);
 await page.getByLabel('Minimum asset capacity').selectOption('500');await expect(rows).toHaveCount(0);
 await page.getByLabel('Minimum asset capacity').selectOption('0');await page.getByRole('button',{name:'Inspect Fen Farm Solar Park generation',exact:true}).click();
 const detail=page.getByRole('region',{name:'Selected map evidence'});await expect(detail).toContainText('1 MW');await expect(detail).toContainText('Output unavailable');await expect(detail).toContainText('gb:repd-1018');await expect(detail).not.toContainText('Half-hour average');await expect(detail.getByRole('link',{name:'Permanent link to this asset'})).toHaveAttribute('href','/?asset=repd-1018');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('new source-ID asset supports direct link',async({page})=>{await page.goto('/?asset=repd-1018');await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('Fen Farm Solar Park')});
test('catalogue fetch failure retains curated map with explicit coverage warning',async({page})=>{await page.route('**/data/operational-assets.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();await expect(page.getByText('Wider catalogue unavailable; retained curated entries shown.')).toBeVisible();await expect(page.locator('.atlas-access-list[data-layer=generation] button')).toHaveCount(47)});
