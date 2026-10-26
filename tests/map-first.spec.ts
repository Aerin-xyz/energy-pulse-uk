import {test,expect} from '@playwright/test';
for(const width of [320,360,390,430,768,1024,1366,1920])test(`map leads homepage at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.locator('.atlas-map')).toBeVisible();
 await expect(page.locator('.national-status')).toHaveCount(0);await expect(page.getByText('Each source has its own clock.',{exact:false})).toHaveCount(0);await expect(page.locator('.national-heading p')).toHaveCount(0);
 const layout=await page.evaluate(()=>{const atlas=document.querySelector('.national-atlas')!.getBoundingClientRect(),canvas=document.querySelector('.map-canvas')!.getBoundingClientRect(),metrics=document.querySelector('.national-metrics')!.getBoundingClientRect(),grid=document.querySelector('.national-layout')!.getBoundingClientRect();return {top:atlas.top,canvasTop:canvas.top,before:atlas.bottom<=metrics.top,width:Math.abs(atlas.width-grid.width),first:document.querySelector('.national-layout')!.firstElementChild!.className,overflow:document.documentElement.scrollWidth>innerWidth};});
 expect(layout.top).toBeLessThan(280);expect(layout.canvasTop).toBeLessThan(480);expect(layout.before).toBe(true);expect(layout.width).toBeLessThan(1);expect(layout.first).toBe('national-atlas');expect(layout.overflow).toBe(false);
 await expect(page.locator('.national-total')).toContainText('FUELINST');await page.getByRole('button',{name:'Completed half-hour',exact:true}).click();await expect(page.locator('.national-total')).toContainText('FUELHH');
});
