import { chromium } from "@playwright/test";
import fs from "node:fs";
const b = await chromium.launch();
const results = [];
for (const width of [390, 1366]) {
  const c = await b.newContext({
    viewport: { width, height: width === 390 ? 844 : 768 },
    reducedMotion: "reduce",
  });
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4175");
  await p.locator(".generation-layer").waitFor();
  await p.addScriptTag({
    path: "/tmp/atlas-review-tools/node_modules/axe-core/axe.min.js",
  });
  async function check(state) {
    const audit = await p.evaluate(async () => {
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
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        manualReview: r.incomplete.map((v) => ({
          id: v.id,
          count: v.nodes.length,
        })),
        passes: r.passes.length,
      };
    });
    results.push({ width, state, ...audit });
  }
  await check("map");
  await p.getByRole("button", { name: "Filters", exact: true }).click();
  await check("filters");
  await p.keyboard.press("Escape");
  if (width === 390)
    await p
      .getByRole("button", { name: "Search generation sites", exact: true })
      .click();
  await p.getByRole("searchbox").first().fill("Drax");
  await check("search");
  await p
    .locator(".atlas-access-list button")
    .filter({ hasText: "Drax" })
    .first()
    .click();
  await check("detail");
  await c.close();
}
fs.writeFileSync(
  "docs/atlas-ux-review/results/after-accessibility-states.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      engine:
        "Chromium + axe-core; automated subset, not WCAG conformance certification",
      results,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    results.map((r) => ({
      width: r.width,
      state: r.state,
      violations: r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.length,
      })),
    })),
  ),
);
await b.close();
