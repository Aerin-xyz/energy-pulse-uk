import {test,expect} from '@playwright/test';
for(const width of [320,360,390,430,768,1024,1366,1920])test(`automatic complete map and fullscreen at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.locator('#grid-map')).toBeVisible();
 await expect(page.getByRole('button',{name:'Open interactive atlas',exact:true})).toHaveCount(0);
 const fits=()=>page.evaluate(()=>{const c=document.querySelector('.map-canvas')!.getBoundingClientRect(),s=document.querySelector('.atlas-map')!.getBoundingClientRect();return {width:Math.abs(c.width-s.width),height:Math.abs(c.height-s.height),overflow:document.documentElement.scrollWidth>innerWidth};});
 expect(await fits()).toEqual({width:0,height:0,overflow:false});
 await page.getByRole('button',{name:'Expand map',exact:true}).click();
 const bounds=await page.locator('#grid-map').boundingBox();expect(bounds!.x).toBe(0);expect(bounds!.y).toBe(0);expect(bounds!.width).toBe(width);expect(bounds!.height).toBe(900);
 expect(await fits()).toEqual({width:0,height:0,overflow:false});
 await page.keyboard.press('Escape');await expect(page.locator('#grid-map')).not.toHaveClass(/expanded/);
 expect(await fits()).toEqual({width:0,height:0,overflow:false});
});
