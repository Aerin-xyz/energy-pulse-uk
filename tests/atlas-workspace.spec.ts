import { test, expect } from "@playwright/test";
import {
  searchSite,
  selectSite,
  closePanel,
  openFilters,
  evidence,
  inspector,
} from "./atlas-review-helpers";
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
  [1440, 1000],
  [1920, 1080],
])
  test(`atlas search, same evidence and safe layout ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await searchSite(page, "Drax");
    const result = page
      .locator(".atlas-access-list button")
      .filter({ hasText: "Drax" })
      .first();
    await expect(result).toBeVisible();
    const r = await result.boundingBox();
    expect(r!.y + r!.height).toBeLessThanOrEqual(height);
    await result.click();
    await expect(evidence(page)).toContainText("Installed site capacity");
    await expect(evidence(page)).toContainText("Notified output");
    await expect(page).toHaveURL(/asset=drax/);
    const camera = await page.locator(".atlas-map").getAttribute("viewBox");
    await closePanel(page);
    await expect(inspector(page)).toHaveAttribute("data-panel", "search");
    await closePanel(page);
    await expect(page.locator(".atlas-map")).toHaveAttribute(
      "viewBox",
      camera!,
    );
    const marker = page.getByRole("button", {
      name: "Inspect Drax generation",
      exact: true,
    });
    await marker.click();
    await expect(evidence(page)).toContainText("Installed site capacity");
    await expect(evidence(page)).toContainText("Notified output");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
test("filter chips, reset and Back preserve context without pan history spam", async ({
  page,
}) => {
  await page.goto("/");
  await openFilters(page);
  await page.getByLabel("Minimum asset capacity").selectOption("100");
  await page.getByLabel("Asset geography").selectOption("England");
  await closePanel(page);
  await expect(page.getByLabel("Active map filters")).toContainText(
    "Installed > 100 MW",
  );
  await selectSite(page, "Drax");
  const camera = await page.locator(".atlas-map").getAttribute("viewBox");
  await page.goBack();
  await expect(page.getByRole("searchbox").last()).toHaveValue("Drax");
  await page.goForward();
  await expect(evidence(page)).toContainText("Drax");
  await expect(page.locator(".atlas-map")).toHaveAttribute("viewBox", camera!);
  await closePanel(page);
  await closePanel(page);
  const length = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Pan east", exact: true }).click();
  await page.getByRole("button", { name: "Pan west", exact: true }).click();
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page
    .getByRole("button", { name: "Clear all filters & search" })
    .click();
  await expect(page.getByLabel("Active map filters")).not.toContainText(
    "Installed > 100 MW",
  );
});
test("camera, filters and selection survive navigation away and Back", async ({
  page,
}) => {
  await page.goto("/?asset=drax");
  await expect(evidence(page)).toContainText("Drax");
  const camera = await page.locator(".atlas-map").getAttribute("viewBox");
  await page
    .getByRole("navigation", { name: "Grid navigation", exact: true })
    .getByRole("link", { name: "Sources", exact: true })
    .click();
  await page.goBack();
  await expect(evidence(page)).toContainText("Drax");
  await expect(page.locator(".atlas-map")).toHaveAttribute("viewBox", camera!);
});
test("mobile sheets trap focus, restore origin and fit a reduced visual viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const filters = page.getByRole("button", { name: "Filters", exact: true });
  await filters.click();
  const dialog = page.getByRole("dialog", { name: "Filters & layers" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 22; i++) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest("dialog")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(filters).toBeFocused();
  await page
    .getByRole("button", { name: "Search generation sites", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 480 });
  await page.getByRole("searchbox").fill("Drax");
  const b = await page.getByRole("dialog").boundingBox();
  expect(b!.y).toBeGreaterThanOrEqual(0);
  expect(b!.y + b!.height).toBeLessThanOrEqual(481);
});
test("embedded touch scrolls; expanded touch pans, pinch and buttons remain available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const svg = page.locator("svg.asset-navigable");
  await svg.scrollIntoViewIfNeeded();
  const before = await svg.getAttribute("viewBox");
  const cdp = await page.context().newCDPSession(page);
  let box = await svg.boundingBox();
  let x = box!.x + box!.width * 0.65,
    y = Math.min(640, box!.y + box!.height * 0.6);
  const scroll = await page.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let i = 1; i <= 5; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - i * 24, id: 1 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(svg).toHaveAttribute("viewBox", before!);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll);
  await page.getByRole("button", { name: "Expand map", exact: true }).click();
  await svg.scrollIntoViewIfNeeded();
  box = await svg.boundingBox();
  x = box!.x + box!.width * 0.6;
  y = Math.min(620, box!.y + box!.height * 0.5);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 25, y, id: 1 },
      { x: x + 25, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 65, y, id: 1 },
      { x: x + 65, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(svg).not.toHaveAttribute("viewBox", before!);
  await expect(page.getByRole("button", { name: "Pan east" })).toBeVisible();
  await page
    .getByRole("button", { name: "Close expanded map", exact: true })
    .click();
});
test("last-good national content stays visible and is marked retained on failed refresh", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-total strong")).toContainText(/\d/);
  const value = await page.locator(".map-total strong").innerText();
  await page.route("**/api/grid-evidence*", (r) =>
    r.fulfill({ status: 503, json: { error: "unavailable" } }),
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    window.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    window.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".map-total")).toHaveAttribute(
    "data-source-state",
    "retained",
    { timeout: 10000 },
  );
  await expect(page.locator(".map-total strong")).toHaveText(value);
});

test("desktop typing stays in the search field as results appear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  const input = page.getByRole("searchbox").first();
  await input.click();
  await input.pressSequentially("Drax", { delay: 100 });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Drax");
  await expect(page.locator(".atlas-access-list button")).toHaveCount(1);
});

test("Back from the desktop inspector restores its originating control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Filters", exact: true });
  await button.click();
  await expect(page.getByLabel("Minimum asset capacity")).toBeVisible();
  await page.goBack();
  await expect(page.locator(".atlas-inspector")).toHaveCount(0);
  await expect(button).toBeFocused();
});
