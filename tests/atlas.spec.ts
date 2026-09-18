import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
const snapshot = JSON.parse(
  readFileSync(
    new URL("./fixtures/grid-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const forecast = JSON.parse(
  readFileSync(
    new URL("./fixtures/carbon-forecast.json", import.meta.url),
    "utf8",
  ),
);
const evidenceFixture = {schemaVersion:1,sources:{FUELINST:{records:[]},FUELHH:{records:Object.entries({WIND:20000,CCGT:10000,NUCLEAR:5000,BIOMASS:1000,NPSHYD:900,OCGT:0,COAL:0,OIL:0,OTHER:0,PS:0,INTFR:900,INTIFA2:0,INTELEC:0,INTNED:0,INTNEM:0,INTNSL:0,INTVKL:0,INTEW:0,INTIRL:0,INTGRNL:0}).map(([fuelType,generation])=>({fuelType,generation,startTime:'2026-09-12T12:00:00Z',publishTime:'2026-09-12T12:30:00Z'}))},INDO:{records:[{demand:40000,startTime:'2026-09-12T12:00:00Z',publishTime:'2026-09-12T12:30:00Z'}]}}};
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-12T12:50:00Z") });
  await page.route("**/functions/v1/energy-data?**", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.route("**/api.carbonintensity.org.uk/intensity/**", (route) =>
    route.fulfill({ json: forecast }),
  );
  await page.route("**/api.carbonintensity.org.uk/regional", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            from: "2026-09-12T12:30Z",
            to: "2026-09-12T13:00Z",
            regions: [
              {
                regionid: 1,
                shortname: "North Scotland",
                intensity: { forecast: 20, index: "very low" },
              },
            ],
          },
        ],
      },
    }),
  );
  await page.route("**/data/grid-evidence.json",route=>route.fulfill({json:evidenceFixture}));
  await page.route("**/functions/v1/historical-generation", (route) =>
    route.fulfill({
      json: { data: [], totalPeriods: 0, meta: { periods: 0 } },
    }),
  );
});
for (const width of [390, 768, 1440])
  test(`atlas readable and interactive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Grid Command Centre",
      }),
    ).toBeVisible();
    await expect(page.locator(".cc-summary")).toContainText("36.9");
    await expect(page.locator(".atlas-signals")).toContainText("0.9");
    await expect(page.locator(".atlas-outlook")).toContainText(
      "Lowest average forecast",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Connections", exact: true }).click();
    await page.getByRole("button", { name: "France", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Selected map evidence" }),
    ).toContainText("IFA / IFA2 / ElecLink");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("region", { name: "Selected map evidence" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Regional carbon", exact: true })
      .click();
    await page
      .getByRole("button", { name: "North Scotland · 20g", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Selected map evidence" }),
    ).toContainText("forecast");
    await page.getByRole("button", { name: "Close map detail" }).click();
    await page.getByRole("button", { name: "%", exact: true }).click();
    await expect(page.locator(".atlas-fuel").first()).toContainText("54.2");
  });
test("old report dates retain their report and unknown dates are not substituted", async ({
  page,
}) => {
  await page.goto("/reports/weekly/2026-05-11");
  await expect(page.locator("h1")).toContainText("11 May");
  await page.goto("/reports/weekly/1900-01-01");
  await expect(page.locator("h1")).toContainText("not in the archive");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, follow",
  );
});
test("unavailable readings do not invent a trend or forecast", async ({
  page,
}) => {
  await page.route("**/data/grid-evidence.json", route=>route.fulfill({json:{schemaVersion:1,sources:{}}}));
  await page.route("**/functions/v1/energy-data?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.route("**/api.carbonintensity.org.uk/intensity/**", (route) =>
    route.fulfill({ json: { data: [] } }),
  );
  await page.goto("/");
  await expect(page.locator(".atlas-outlook")).toContainText(
    "No complete future window",
  );
  await expect(page.locator(".atlas-now")).toContainText(
    "Unavailable",
  );
  await expect(page.locator(".cc-donut")).toContainText("—");
});
test("reduced motion hides flow travellers", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".cc-summary")).toContainText("36.9");
  expect(await page.locator(".atlas-traveller:visible").count()).toBe(0);
});
test("archived HTML and current snapshot have correct canonical meaning without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/reports/weekly/2026-05-11/");
  await expect(page.locator("h1")).toContainText("11 May");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://energymix.info/reports/weekly/2026-05-11/",
  );
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("body")).toContainText(
    "National demand (INDO)",
  );
  await expect(page.locator("body")).toContainText("not a live reading");
  await context.close();
});

test('expanded map is a keyboard-dismissable modal and restores focus',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Expand map',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Great Britain electricity atlas'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Close expanded map'})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Expand map',exact:true})).toBeFocused();
});

test('ambient motion can be paused independently of live readings', async ({page})=>{
 await page.goto('/');
 await expect(page.locator('.cc-summary')).toContainText('36.9');
 await page.getByRole('button',{name:'Pause ambient motion'}).click();
 await expect(page.locator('.observatory')).toHaveAttribute('data-motion','off');
 expect(await page.locator('.atlas-traveller:visible').count()).toBe(0);
 expect(await page.locator('.cc-orb').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await expect(page.locator('.cc-summary')).toContainText('36.9');
 await page.getByRole('button',{name:'Enable ambient motion'}).click();
 await expect(page.locator('.observatory')).toHaveAttribute('data-motion','on');
});

test('cable layer keeps French readings separate and shows signed evidence',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-14T20:32:00Z'));
 const cables=JSON.parse(readFileSync(new URL('./fixtures/cable-flows.json',import.meta.url),'utf8'));
 await page.route('**/data/grid-evidence.json',route=>route.fulfill({json:{...evidenceFixture,sources:{...evidenceFixture.sources,FUELINST:{records:cables.data}}}}));
 await page.goto('/');
 await expect(page.locator('.cable-map-layer')).toContainText('603 MW ← GB');
 await page.getByRole('button',{name:'ElecLink',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('603 MW · exporting from GB');
 await expect(page.locator('.cable-facts')).toContainText('60.3%');
 await expect(page.locator('.cable-history')).toBeVisible();
 await page.getByRole('button',{name:'Close map detail'}).click();
 await page.getByRole('button',{name:'BritNed',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('zero measured flow');
});
test('delayed cable readings are stationary and unavailable is not zero',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-09-14T22:00:00Z'));
 const cables=JSON.parse(readFileSync(new URL('./fixtures/cable-flows.json',import.meta.url),'utf8'));
 cables.data=cables.data.filter(r=>r.fuelType!=='INTELEC');
 await page.route('**/data/grid-evidence.json',route=>route.fulfill({json:{...evidenceFixture,sources:{...evidenceFixture.sources,FUELINST:{records:cables.data}}}}));
 await page.goto('/');
 await expect(page.locator('.cable-map-layer')).toContainText('delayed');
 expect(await page.locator('.cable-map-layer .atlas-traveller').count()).toBe(0);
 await page.getByRole('button',{name:'ElecLink',exact:true}).click();
 await expect(page.getByRole('region',{name:'Selected map evidence'})).toContainText('Reading unavailable');
});
