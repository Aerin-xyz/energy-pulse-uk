import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`asset explorer navigation and filters ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();
 await expect(page.locator('.atlas-access-list[data-layer=generation] button')).toHaveCount(60);const svg=page.locator('svg.asset-navigable');const start=await svg.getAttribute('viewBox');
 await page.getByRole('button',{name:'Zoom in on generation assets'}).click();expect(await svg.getAttribute('viewBox')).not.toBe(start);
 await page.getByRole('button',{name:'Pan east',exact:true}).click();await page.getByRole('button',{name:'Reset GB view'}).click();await expect(svg).toHaveAttribute('viewBox',start!);
 await page.getByLabel('Asset geography').selectOption('Wales');await page.getByRole('searchbox',{name:'Find a generation site'}).fill('Pembroke');await expect(page.locator('.atlas-access-list[data-layer=generation]')).toContainText('Pembroke');await expect(page.locator('.atlas-access-list[data-layer=generation]')).not.toContainText('Drax');
 await page.getByLabel('Asset data availability').selectOption('Capacity only');await expect(page.locator('.atlas-access-list[data-layer=generation]')).not.toContainText('Pembroke');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('asset deep link opens reviewed evidence and separates scheduled and metered numbers',async({page})=>{
 await page.goto('/?asset=drax');const detail=page.getByRole('region',{name:'Selected map evidence'});await expect(detail).toContainText('Drax');await expect(detail).toContainText('Notified operating plan');await expect(detail).toContainText('SCHEDULED · NOT MEASURED');await expect(detail.getByRole('link',{name:'Permanent link to this asset'})).toHaveAttribute('href','/?asset=drax');
});
