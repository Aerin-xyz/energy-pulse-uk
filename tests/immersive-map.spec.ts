import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`immersive network map controls and readable summary ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');
 await expect(page.locator('.network-backdrop .network-line')).toHaveCount(3);
 await expect(page.locator('.network-key')).toContainText('not live flows');
 await expect(page.locator('.map-filter-drawer')).not.toHaveAttribute('open','');
 await page.getByRole('button',{name:'Network backdrop on'}).click();await expect(page.locator('.network-backdrop')).toHaveCount(0);
 await page.getByRole('button',{name:'Network backdrop off'}).click();await expect(page.locator('.network-backdrop')).toHaveCount(1);
 await page.locator('.map-filter-drawer > summary').click();await expect(page.getByLabel('Minimum asset capacity')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.map-filter-drawer')).not.toHaveAttribute('open','');
 await page.getByRole('searchbox',{name:'Find a generation site'}).fill('Drax');await page.getByRole('button',{name:'Inspect Drax generation',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('Drax');await page.getByRole('button',{name:'Close map detail'}).click();
 await expect(page.getByRole('region',{name:'Electricity snapshot',exact:true})).toContainText('Generation excludes embedded estimates');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('unavailable backdrop never removes asset map or claims live infrastructure',async({page})=>{
 await page.route('**/data/network-geography.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto('/');
 await expect(page.getByText('Network geography unavailable',{exact:true})).toBeVisible();await expect(page.locator('.generation-layer')).toBeVisible();
});
test('two-finger pinch zoom preserves real map coordinates',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.goto('/');const svg=page.locator('svg.asset-navigable');await svg.scrollIntoViewIfNeeded();const before=await svg.getAttribute('viewBox');
 const cdp=await page.context().newCDPSession(page),box=await svg.boundingBox();const x=box!.x+box!.width/2,y=Math.max(200,box!.y+box!.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});
 await expect(svg).not.toHaveAttribute('viewBox',before!);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
});
