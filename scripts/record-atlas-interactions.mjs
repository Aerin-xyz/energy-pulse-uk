import { chromium } from "@playwright/test";
import fs from "node:fs";
const root = "docs/atlas-ux-review/after";
const b = await chromium.launch();
for (const [name, width, height] of [
  ["mobile", 390, 844],
  ["desktop", 1366, 768],
]) {
  const c = await b.newContext({
    viewport: { width, height },
    isMobile: width === 390,
    hasTouch: width === 390,
    recordVideo: { dir: root + "/recording-tmp", size: { width, height } },
  });
  const p = await c.newPage();
  await p.goto("http://127.0.0.1:4175");
  await p.locator(".generation-layer").waitFor();
  await p.waitForTimeout(500);
  if (width === 390)
    await p
      .getByRole("button", { name: "Search generation sites", exact: true })
      .click();
  const search = p.getByRole("searchbox").first();
  await search.click();
  await search.pressSequentially("Drax", { delay: 180 });
  await p.waitForTimeout(600);
  await p
    .locator(".atlas-access-list button")
    .filter({ hasText: "Drax" })
    .first()
    .click();
  await p.waitForTimeout(700);
  await p.locator(".atlas-inspector .atlas-close").click();
  await p.waitForTimeout(300);
  await p.locator(".atlas-inspector .atlas-close").click();
  await p.getByRole("button", { name: "Clear all filters & search" }).click();
  await p.getByRole("button", { name: "Filters", exact: true }).click();
  await p.getByLabel("Minimum asset capacity").selectOption("100");
  await p.waitForTimeout(500);
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Expand map", exact: true }).click();
  await p.getByRole("button", { name: "Zoom in on generation assets" }).click();
  await p.getByRole("button", { name: "Pan east", exact: true }).click();
  await p.waitForTimeout(500);
  if (width === 390) {
    const svg = p.locator(".atlas-map");
    const r = await svg.boundingBox();
    const x = r.x + r.width / 2,
      y = r.y + r.height * 0.65;
    const cd = await c.newCDPSession(p);
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 25, y, id: 1 },
        { x: x + 25, y, id: 2 },
      ],
    });
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 60, y, id: 1 },
        { x: x + 60, y, id: 2 },
      ],
    });
    await cd.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await p.screenshot({ path: root + "/" + name + "-expanded.png" });
  await p.waitForTimeout(600);
  await p
    .getByRole("button", { name: "Close expanded map", exact: true })
    .click();
  await p.goBack();
  await p.waitForTimeout(700);
  const video = p.video();
  await c.close();
  await video.saveAs(root + "/" + name + "-interactions.webm");
}
await b.close();
fs.rmSync(root + "/recording-tmp", { recursive: true, force: true });
console.log(
  "Recorded real Chromium interactions: mobile and desktop; not physical-device video.",
);
