import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync("functions/reports/weekly/[[path]].ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { onRequest } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const assets = {
  fetch: async (request) => {
    const path = new URL(request.url).pathname;
    if (path === "/route-manifest.json")
      return Response.json(["/reports/weekly/2026-05-11"]);
    if (path === "/404.html") return new Response("Not in archive");
    return new Response("11 May original report");
  },
};
test("Pages archive route returns a real 404 for an unknown date", async () => {
  const r = await onRequest({
    request: new Request("https://energymix.info/reports/weekly/1900-01-01/"),
    env: { ASSETS: assets },
    next: async () => new Response("11 May original report"),
  });
  assert.equal(r.status, 404);
  assert.equal(r.headers.get("x-robots-tag"), "noindex");
});
test("Pages archive route serves the exact known date", async () => {
  const r = await onRequest({
    request: new Request("https://energymix.info/reports/weekly/2026-05-11/"),
    env: { ASSETS: assets },
    next: async () => new Response("11 May original report"),
  });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "11 May original report");
});
