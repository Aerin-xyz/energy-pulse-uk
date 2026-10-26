import {test,expect} from '@playwright/test';
const collisions=async(page)=>page.evaluate(()=>{
 const bounds=document.querySelector('.map-canvas')!.getBoundingClientRect();
 const labels=[...document.querySelectorAll('.network-station-label,.asset-marker-caption')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.left<bounds.right&&r.right>bounds.left&&r.top<bounds.bottom&&r.bottom>bounds.top);
 let count=0;for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)count++;}
 return {count,labels:labels.length};
});
for(const width of [390,1366])for(const capacity of [0,100])for(const zoom of [8,16,32])test(`labels ${width}px capacity ${capacity} zoom ${zoom}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto(`/?layer=generation&capacity=${capacity}&expanded=1&camera=415,520,${zoom}`);
 await expect(page.locator('.network-line').first()).toBeAttached();await expect(page.locator('.generation-layer')).toBeAttached();
 await expect(page.locator('.network-station-label')).toHaveCount(0);await expect(page.locator('.network-key')).not.toHaveAttribute('open','');
 await expect.poll(async()=>(await collisions(page)).count).toBe(0);
 await page.locator('.network-key>summary').click();await page.getByRole('button',{name:'Network names off',exact:true}).click();await expect(page).toHaveURL(/networkNames=1/);await expect(page.locator('.network-station-label').first()).toBeAttached();
 await page.locator('.network-key>summary').click();await expect.poll(async()=>(await collisions(page)).count).toBe(0);
 expect((await collisions(page)).labels).toBeGreaterThan(0);
 const height=await page.locator('.network-station-label').first().evaluate(e=>e.getBoundingClientRect().height);expect(height).toBeLessThan(22);
 if(width===390){await expect(page.getByRole('button',{name:'Pan west',exact:true})).toBeHidden();await page.getByRole('button',{name:'Pan controls',exact:true}).click();await expect(page.getByRole('button',{name:'Pan west',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pan west',exact:true}).click();await expect.poll(async()=>(await collisions(page)).count).toBe(0);}
 await page.getByRole('button',{name:'Close expanded map',exact:true}).click();await expect(page.locator('#grid-map')).not.toHaveClass(/expanded/);
});
test('network names URL roundtrip and asset selection',async({page})=>{
 await page.setViewportSize({width:1366,height:900});await page.goto('/?asset=drax&networkNames=1');await expect(page.locator('.asset-evidence')).toContainText('Drax');await page.reload();await expect(page.locator('.asset-evidence')).toContainText('Drax');await page.locator('.network-key>summary').click();await expect(page.getByRole('button',{name:'Network names on',exact:true})).toHaveAttribute('aria-pressed','true');
});
