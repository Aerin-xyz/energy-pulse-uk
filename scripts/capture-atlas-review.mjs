import { chromium, webkit } from "@playwright/test";
import fs from "node:fs";
const base = process.env.REVIEW_URL || "https://energymix.info";
const phase = process.env.REVIEW_PHASE || "before";
const dir = `docs/atlas-ux-review/${phase}`;
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const [width, height] of [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
  [1440, 1000],
  [1920, 1080],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 500,
    hasTouch: width < 500,
    recordVideo:
      width === 390
        ? { dir: dir + "/video", size: { width, height } }
        : undefined,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__review = { lcp: 0, cls: 0, longTasks: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__review.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput) window.__review.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) =>
      window.__review.longTasks.push(...l.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask", buffered: true });
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".map-total").waitFor();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${dir}/${width}x${height}.png` });
  const baseline = await page.evaluate(() => ({
    metrics: window.__review,
    scrollWidth: document.documentElement.scrollWidth,
    viewport: innerWidth,
    domNodes: document.querySelectorAll("*").length,
    smallLabels: [
      ...document.querySelectorAll(
        "#grid-map button,#grid-map label,#grid-map small",
      ),
    ]
      .filter(
        (e) =>
          e.getClientRects().length &&
          parseFloat(getComputedStyle(e).fontSize) < 11,
      )
      .slice(0, 12)
      .map((e) => ({
        text: e.textContent.slice(0, 65),
        size: getComputedStyle(e).fontSize,
      })),
    smallTargets: [...document.querySelectorAll("#grid-map button")]
      .filter((e) => e.getClientRects().length)
      .map((e) => ({
        name: e.getAttribute("aria-label") || e.textContent,
        w: e.getBoundingClientRect().width,
        h: e.getBoundingClientRect().height,
      }))
      .filter((e) => e.h < 32 || e.w < 32)
      .slice(0, 15),
    resources: performance
      .getEntriesByType("resource")
      .reduce((s, e) => s + e.transferSize, 0),
  }));
  if (
    await page
      .getByRole("button", { name: "Search generation sites", exact: true })
      .isVisible()
      .catch(() => false)
  )
    await page
      .getByRole("button", { name: "Search generation sites", exact: true })
      .click();
  const search = page.getByRole("searchbox").first();
  await search.fill("Drax");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${width}-search.png` });
  const results = page
    .locator(".atlas-access-list button")
    .filter({ hasText: "Drax" })
    .first();
  const box = await results.boundingBox().catch(() => null);
  const input = await search.boundingBox();
  report.push({
    width,
    height,
    base,
    at: new Date().toISOString(),
    errors,
    ...baseline,
    search: {
      input,
      result: box,
      resultInViewport: !!box && box.y >= 0 && box.y + box.height <= height,
    },
  });
  if (width === 390 && (await results.count())) {
    await results.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/390-detail.png` });
  }
  await context.close();
}
await browser.close();
let wk;
try {
  const b = await webkit.launch();
  wk = "installed";
  await b.close();
} catch (error) {
  wk = "Launch unavailable: " + error.message.slice(0,1600);
}
fs.writeFileSync(
  `docs/atlas-ux-review/results/${phase}-browser.json`,
  JSON.stringify(
    {
      report,
      webkit: wk,
      notes:
        "Chromium lab snapshots, not real-device/field measurements. Unthrottled, one run per viewport.",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    phase,
    count: report.length,
    webkit: wk,
    report: report.map((r) => ({
      width: r.width,
      overflow: r.scrollWidth > r.viewport,
      resultVisible: r.search.resultInViewport,
      lcp: r.metrics.lcp,
      cls: r.metrics.cls,
      smallLabels: r.smallLabels.length,
    })),
  }),
);
