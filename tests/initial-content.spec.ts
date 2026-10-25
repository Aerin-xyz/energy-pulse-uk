import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('JavaScript-disabled readers receive definitions, source table and honest live state', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/glossary/');
  await expect(page.locator('dt')).toHaveCount(9);
  await expect(page.locator('#settlement-period')).toContainText('30-minute');
  await page.goto('/data/');
  await expect(page.locator('table').first()).toContainText('Generation by fuel');
  await page.goto('/carbon-intensity/');
  await expect(page.getByRole('heading', { name: 'Current readings unavailable', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What is a low carbon-intensity number?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saved GB electricity snapshot' })).toHaveCount(0);
  await context.close();
});

test('source outage never resurrects the old snapshot or shows zeros as current readings', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'fixture source outage' } }));
  await page.route('https://data.elexon.co.uk/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('https://api.carbonintensity.org.uk/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/carbon-intensity/');
  await expect(page.locator('[data-evidence-status="unavailable"]')).toBeVisible();
  await expect(page.locator('[data-evidence-status="unavailable"]')).not.toContainText(/0\.0 GW|0\.0%|29 Sept/);
  await expect(page.getByRole('heading', { name: 'Saved GB electricity snapshot' })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(runtimeErrors).toEqual([]);
  expect(await page.locator('script#site-identity').count()).toBe(1);
  await expect(page.locator('[data-evidence-status="unavailable"]')).toBeVisible();
});

test('a newer client interval replaces the initial unavailable state without competing saved data', async ({ page }) => {
  const seed = JSON.parse(fs.readFileSync('tests/fixtures/grid-snapshot.json', 'utf8'));
  await page.clock.install({ time: new Date('2026-10-25T09:41:00Z') });
  await page.route('**/api/energy-data*', route => route.fulfill({ json: {
    ...seed, lastUpdated: '2026-10-25T09:30:00Z', asOf: { ...seed.asOf, endISO: '2026-10-25T09:30:00Z' },
    carbonIntensity: { schemaVersion: 2, actual: 69, forecast: 68, intervalFrom: '2026-10-25T09:00:00Z', intervalTo: '2026-10-25T09:30:00Z', timestamp: '2026-10-25T09:30:00Z', forecastData: [] },
  } }));
  await page.route('https://data.elexon.co.uk/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('https://api.carbonintensity.org.uk/**', route => route.fulfill({ json: { data: [] } }));
  await page.goto('/carbon-intensity/');
  await expect(page.getByRole('heading', { name: 'Carbon intensity now', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('69 gCO₂/kWh');
  await expect(page.locator('[data-evidence-status="unavailable"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Saved GB electricity snapshot' })).toHaveCount(0);
  const identity = await page.locator('script#site-identity').allTextContents();
  expect(identity).toHaveLength(1);
  expect(JSON.parse(identity[0])['@graph'].filter((item: { '@type': string }) => item['@type'] === 'Organization')).toHaveLength(1);
});
