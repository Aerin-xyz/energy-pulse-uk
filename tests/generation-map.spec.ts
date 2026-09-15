import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`generation layer ${width}px: filters, evidence and preserved cables`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await page.getByRole('button',{name:'Generation',exact:true}).click();
 await expect(page.getByText('metered history, not live',{exact:true})).toBeVisible();
 await expect(page.locator('.generation-layer [role=button]')).toHaveCount(8);
 await page.getByRole('button',{name:'Inspect Drax generation',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('4 / 4');
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('not live');
 await page.getByRole('button',{name:'Close map detail'}).click();
 await page.getByRole('button',{name:'Offshore wind',exact:true}).click();await expect(page.locator('.generation-layer [role=button]')).toHaveCount(2);
 await page.getByRole('button',{name:'Expand map',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Inspect Hornsea One generation'}).click();await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('Hornsea One');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Cables',exact:true}).click();await expect(page.locator('.atlas-access-list[data-layer=cables] button')).toHaveCount(10);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('unavailable generation never looks like measured zero',async({page})=>{
 await page.route('**/data/generation-assets.json',r=>r.fulfill({json:{checkedAt:null,points:[]}}));await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();await page.getByRole('button',{name:'Inspect Drax generation'}).click();await expect(page.getByText('Output unavailable',{exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('0 / 4');
});
