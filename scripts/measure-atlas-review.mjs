import { chromium } from "@playwright/test";
import fs from "node:fs";
const phase = process.env.REVIEW_PHASE || "before",
  url = process.env.REVIEW_URL || "https://energymix.info";
const b = await chromium.launch();
const runs = [];
for (let i = 0; i < 3; i++) {
  const c = await b.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await c.newPage();
  const cd = await c.newCDPSession(p);
  await cd.send("Network.enable");
  await cd.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 93750,
  });
  await cd.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, events: [], longTasks: [] };
    for (const type of [
      "largest-contentful-paint",
      "layout-shift",
      "event",
      "longtask",
    ])
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (type === "largest-contentful-paint")
            window.__perf.lcp = e.startTime;
          if (type === "layout-shift" && !e.hadRecentInput)
            window.__perf.cls += e.value;
          if (type === "event" && e.interactionId)
            window.__perf.events.push({ duration: e.duration, type: e.name });
          if (type === "longtask") window.__perf.longTasks.push(e.duration);
        }
      }).observe({ type, buffered: true, durationThreshold: 16 });
  });
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.locator(".map-total").waitFor();
  await p.locator(".network-backdrop").waitFor({timeout:60000});
  await p.locator(".generation-layer .asset-marker").first().waitFor();
  const mapReadyMs=await p.evaluate(()=>performance.now());
  await p.waitForTimeout(2000);
  const search = p.getByRole("searchbox");
  if (await search.isVisible()) {
    await search.click();
    await search.pressSequentially("Drax", { delay: 120 });
  } else {
    await p
      .getByRole("button", { name: "Search generation sites", exact: true })
      .click();
    await p.getByRole("searchbox").click();
    await p.getByRole("searchbox").pressSequentially("Drax", { delay: 120 });
  }
  await p.waitForTimeout(800);
  const result = await p.evaluate(() => ({
    ...window.__perf,
    resources: performance
      .getEntriesByType("resource")
      .reduce((n, r) => n + r.transferSize, 0),
  }));
  runs.push({ run: i + 1, mapReadyMs, ...result });
  await c.close();
}
const c = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await c.newPage();
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
await p.addScriptTag({
  path: "/tmp/atlas-review-tools/node_modules/axe-core/axe.min.js",
});
const axe = await p.evaluate(async () => {
  const r = await window.axe.run(document, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
    },
  });
  return {
    violations: r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    incomplete: r.incomplete.map((v) => ({ id: v.id, count: v.nodes.length })),
    passes: r.passes.length,
  };
});
fs.writeFileSync(
  `docs/atlas-ux-review/results/${phase}-performance-accessibility.json`,
  JSON.stringify(
    {
      url,
      at: new Date().toISOString(),
      conditions: {
        viewport: "390×844",
        cpu: "4× slowdown",
        network: "150ms latency, 1.6Mbps download, 0.75Mbps upload",
        runs: 3,
        fieldData: false,
        note: "Lab Event Timing durations are not field INP/p75. One scripted search interaction per run.",
      },
      runs,
      axe,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    phase,
    runs: runs.map((r) => ({
      run: r.run,
      lcp: r.lcp,
      cls: r.cls,
      events: r.events,
    })),
    violations: axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.length,
    })),
  }),
);
await b.close();
