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
    await expect(page.locator(".atlas-fuel").first()).toContainText("58.0");
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
    "Estimated supply-balance demand",
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
