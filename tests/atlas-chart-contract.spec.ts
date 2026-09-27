import { test, expect } from "@playwright/test";
import fs from "node:fs";
const energy = JSON.parse(
  fs.readFileSync("tests/fixtures/grid-snapshot.json", "utf8"),
);
test("historical tooltips keep power and daily energy distinct with keyboard and touch inspection", async ({
  page,
}) => {
  await page.route("**/api/energy-data", (r) => r.fulfill({ json: energy }));
  await page.route("**/api/history*", (r) => {
    const daily = r.request().url().includes("7d");
    const data = [0, 1, 2].map((i) => ({
      settlementDate: "2026-09-27",
      settlementPeriod: i + 1,
      timestamp: new Date(
        Date.UTC(
          2026,
          8,
          27,
          daily ? 0 : 12 + i / 2,
          daily ? 0 : (i % 2) * 30,
        ) + (daily ? i * 86400000 : 0),
      ).toISOString(),
      dayName: ["Mon", "Tue", "Wed"][i],
      fuelMix: [
        {
          fuelType: "Wind",
          mw: daily ? 240000 : 10000,
          percentage: 100,
          color: "#fff",
        },
      ],
      totalMW: daily ? 240000 : 10000,
    }));
    return r.fulfill({
      json: {
        data,
        lastUpdated: "2026-09-27T14:00:00Z",
        totalPeriods: 3,
        meta: {
          periods: 3,
          solarMatchedCount: 0,
          totalDays: 3,
          solarMatchedDays: 0,
        },
      },
    });
  });
  await page.goto("/explore");
  await expect(page.locator('.recharts-pie-sector path[fill="#43d9bf"]')).toHaveCount(1);
  const power = page.getByRole("tab", {
    name: "Last 24 hours · GW",
    exact: true,
  });
  await expect(power).toBeVisible();
  await power.scrollIntoViewIfNeeded();
  let chart = page
    .getByRole("tabpanel")
    .filter({ has: page.locator(".recharts-wrapper") });
  await chart
    .getByText("Inspect values without hovering", { exact: true })
    .click();
  const selector = page.getByLabel("Inspect power period");
  await selector.focus();
  await page.keyboard.press("ArrowDown");
  await expect(chart.locator(".chart-data-inspector")).toContainText("10.0 GW");
  await expect(chart.locator(".chart-data-inspector")).not.toContainText("GWh");
  await page
    .getByRole("tab", { name: "Daily energy · GWh", exact: true })
    .click();
  chart = page
    .getByRole("tabpanel")
    .filter({ has: page.locator(".recharts-wrapper") });
  await chart
    .getByText("Inspect values without hovering", { exact: true })
    .click();
  await page.getByLabel("Inspect daily energy").selectOption("1");
  await expect(chart.locator(".chart-data-inspector")).toContainText(
    "240.0 GWh",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await power.click();
  chart = page
    .getByRole("tabpanel")
    .filter({ has: page.locator(".recharts-wrapper") });
  await chart.locator(".recharts-wrapper").scrollIntoViewIfNeeded();
  const box = await chart.locator(".recharts-wrapper").boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + 120, id: 1 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(
    chart.locator(".recharts-tooltip-wrapper .history-value-tooltip"),
  ).toContainText("10.0 GW");
});
test("mobile menu preserves all sections and dismissal returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.click();
  await expect(
    page.getByRole("navigation", { name: "All sections" }).getByRole("link"),
  ).toHaveCount(13);
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("navigation", { name: "All sections" })
    .getByRole("link", { name: "Constraints" })
    .click();
  await expect(page).toHaveURL(/network-constraints/);
  await expect(
    page.getByRole("navigation", { name: "Quick navigation" }),
  ).toBeVisible();
});
