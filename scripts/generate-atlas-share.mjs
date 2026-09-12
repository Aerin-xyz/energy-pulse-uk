import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const countries = JSON.parse(
  readFileSync(
    new URL("../src/data/atlas/countries.json", import.meta.url),
    "utf8",
  ),
);
const font = readFileSync(
  new URL("../public/source-sans-3.woff2", import.meta.url),
).toString("base64");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(
  `<style>@font-face{font-family:Source;src:url(data:font/woff2;base64,${font})}*{box-sizing:border-box}body{margin:0;background:#061119;color:#e9f2ef;font-family:Source,sans-serif}.copy{position:absolute;left:65px;top:65px}.brand{font-size:29px;letter-spacing:-1px}.brand span{color:#86d9bd}.eyebrow{font-size:13px;letter-spacing:3px;color:#9dbdbb;margin-top:78px}h1{font-size:65px;font-weight:500;letter-spacing:-2px;line-height:1.08;margin:22px 0}h1 span{color:#86d9bd}.foot{position:absolute;left:65px;bottom:50px;font-size:16px;color:#a8bdc0}.map{position:absolute;right:0;top:15px;width:590px;height:600px;opacity:.85}</style><svg class="map" viewBox="65 55 825 720"><defs><radialGradient id="sea"><stop stop-color="#173d3d"/><stop offset="1" stop-color="#061119"/></radialGradient></defs><ellipse cx="450" cy="410" rx="380" ry="380" fill="url(#sea)"/>${countries.map((c) => `<path d="${c.path}" fill="${c.name === "United Kingdom" ? "#15393a" : "#0c1c24"}" stroke="${c.name === "United Kingdom" ? "#5d9c90" : "#263d44"}" stroke-width="1.4"/>`).join("")}<g fill="none" stroke="#75d6b6" opacity=".75"><path d="M426 373 Q610 170 726 130"/><path d="M484 480 Q690 380 810 385"/><path d="M484 627 Q535 638 570 727"/><path d="M346 486 Q225 435 156 560"/></g><g fill="#a0e8c8"><circle cx="426" cy="373" r="4"/><circle cx="484" cy="480" r="4"/><circle cx="484" cy="627" r="4"/><circle cx="346" cy="486" r="4"/></g></svg><div class="copy"><div class="brand">energy<span>mix</span></div><div class="eyebrow">THE ELECTRICITY ATLAS</div><h1>Britain’s electricity.<br><span>Live, explained.</span></h1></div><div class="foot">Follow the flows. Understand the changes. &nbsp; energymix.info</div>`,
);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: new URL("../public/og-atlas.png", import.meta.url).pathname,
});
await browser.close();
console.log("Generated atlas brand share image (no live numerical claims).");
