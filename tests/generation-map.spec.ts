import {browse,closeAllPanels,openFilters,searchSite,selectSite,evidence} from './atlas-review-helpers';
import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`generation layer ${width}px: filters, evidence and preserved cables`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await page.getByRole('button',{name:'Generation',exact:true}).click();await browse(page);
 await expect(page.locator('.atlas-access-list')).toContainText('Capacity / location only');
 await openFilters(page);await page.getByRole('button',{name:'Reviewed sites only',exact:true}).click();await browse(page);
 await expect(page.locator('.atlas-access-list[data-layer=generation] button')).toHaveCount(8);
 await searchSite(page,'Drax');
 await closeAllPanels(page);await page.getByRole('button',{name:'Inspect Drax generation',exact:true}).click();
 await expect(evidence(page)).toContainText('4 / 4');
 await expect(evidence(page)).toContainText('not live');
 await page.getByRole('button',{name:'Close map detail'}).click();
 await selectSite(page,'Hornsea One');await openFilters(page);await page.getByRole('button',{name:'Offshore wind',exact:true}).click();await closeAllPanels(page);await expect(page.locator('.generation-layer [role=button]')).toHaveCount(1);
 await page.getByRole('button',{name:'Expand map',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'Inspect Hornsea One generation'}).click();await expect(evidence(page)).toContainText('Hornsea One');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Cables',exact:true}).click();await browse(page);await expect(page.locator('.atlas-access-list[data-layer=cables] button')).toHaveCount(10);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('unavailable generation never looks like measured zero',async({page})=>{
 await page.route('**/data/generation-assets.json',r=>r.fulfill({json:{checkedAt:null,points:[]}}));await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();await browse(page);await searchSite(page,'Drax');await closeAllPanels(page);await page.getByRole('button',{name:'Inspect Drax generation'}).click();await expect(evidence(page).getByText('Output unavailable',{exact:true})).toBeVisible();await expect(evidence(page)).toContainText('0 / 4');
});

test('nearby clusters expose individual sites; unmapped sites never show zero',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Generation',exact:true}).click();await browse(page);await expect(page.locator('.atlas-access-list[data-layer=generation] button')).toHaveCount(60);
 await closeAllPanels(page);
 const cluster=page.locator('.generation-layer [role=button]').filter({has:page.locator('.asset-count')}).first();await cluster.click();await expect(page.getByText('Choose a site',{exact:true})).toBeVisible();await page.locator('.asset-cluster-list button').first().click();await expect(evidence(page)).toContainText('Installed site capacity');
 await page.getByRole('button',{name:'Close map detail'}).click();await selectSite(page,'Seagreen');await expect(evidence(page)).toContainText('Not mapped');await expect(evidence(page)).toContainText('Output unavailable');
 await page.getByRole('button',{name:'Close map detail'}).click();await searchSite(page,'nonexistent-site');await expect(page.getByText(/No matching sites/)).toBeVisible();await expect(page.locator('.generation-layer [role=button]')).toHaveCount(0);
});
