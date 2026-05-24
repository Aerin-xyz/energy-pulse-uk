import { expect, test } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number; id: string };

const viewports = [
  { name: 'iphone-se', width: 375, height: 812 },
  { name: 'iphone-15', width: 390, height: 844 },
  { name: 'iphone-pro-max', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
];

const overlap = (a: Box, b: Box, pad = 0) =>
  a.x < b.x + b.width + pad &&
  a.x + a.width + pad > b.x &&
  a.y < b.y + b.height + pad &&
  a.y + a.height + pad > b.y;

const clearance = (a: Box, b: Box) => {
  const dx = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), 0);
  const dy = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height), 0);
  return Math.hypot(dx, dy);
};

test.describe('power-flow deterministic layout', () => {
  for (const viewport of viewports) {
    test(`no overlaps or horizontal scrolling at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/?debugFlowLayout=1', { waitUntil: 'networkidle' });
      await expect(page.locator('#power-flow')).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('#power-flow')).toContainText('Storage');
      await expect(page.locator('#power-flow')).toContainText('Hydro');

      const result = await page.evaluate(() => {
        const toBox = (el: Element, index: number): Box => {
          const rect = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-node-id') || el.textContent?.trim() || `box-${index}`,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        };
        const card = document.querySelector('.em-pfc-card')!.getBoundingClientRect();
        const nodes = Array.from(document.querySelectorAll('.flow-node')).map(toBox);
        const labels = Array.from(document.querySelectorAll('.flow-label')).map(toBox).filter((box) => box.width > 0 && box.height > 0);
        const demand = document.querySelector('.flow-node-demand')!.getBoundingClientRect();
        return {
          card: { id: 'card', x: card.x, y: card.y, width: card.width, height: card.height },
          nodes,
          labels,
          demand: { id: 'demand', x: demand.x, y: demand.y, width: demand.width, height: demand.height },
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          title: document.title,
        };
      });

      expect(result.title).toBe('EnergyMix.info | UK Electricity Dashboard');
      expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth + 1);

      for (const box of [...result.nodes, ...result.labels]) {
        expect(box.x, `${box.id} left inside card`).toBeGreaterThanOrEqual(result.card.x - 1);
        expect(box.y, `${box.id} top inside card`).toBeGreaterThanOrEqual(result.card.y - 1);
        expect(box.x + box.width, `${box.id} right inside card`).toBeLessThanOrEqual(result.card.x + result.card.width + 1);
        expect(box.y + box.height, `${box.id} bottom inside card`).toBeLessThanOrEqual(result.card.y + result.card.height + 1);
      }

      for (let i = 0; i < result.nodes.length; i += 1) {
        for (let j = i + 1; j < result.nodes.length; j += 1) {
          expect(overlap(result.nodes[i], result.nodes[j]), `${result.nodes[i].id} overlaps ${result.nodes[j].id}`).toBe(false);
        }
      }

      for (const label of result.labels) {
        for (const node of result.nodes) {
          expect(overlap(label, node), `${label.id} label overlaps ${node.id} node`).toBe(false);
        }
      }

      for (let i = 0; i < result.labels.length; i += 1) {
        for (let j = i + 1; j < result.labels.length; j += 1) {
          expect(overlap(result.labels[i], result.labels[j]), `${result.labels[i].id} label overlaps ${result.labels[j].id} label`).toBe(false);
        }
      }

      for (const label of result.labels) {
        expect(clearance(result.demand, label), `demand clearance from ${label.id}`).toBeGreaterThanOrEqual(14);
      }

      await page.screenshot({ path: `test-results/power-flow-${viewport.name}.png`, fullPage: true });
    });
  }
});
