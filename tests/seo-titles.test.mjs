import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const expected = "UK Electricity Data: Elexon, NESO & Carbon Intensity";
const dataPage = readFileSync("src/pages/Data.tsx", "utf8");
const prerender = readFileSync("scripts/prerender-static.mjs", "utf8");

test("data page uses one concise, intent-first title in both render paths", () => {
  assert.equal(expected.length, 52);
  assert.match(dataPage, new RegExp(`<title>${expected}</title>`));
  assert.match(prerender, new RegExp(`\\['/data', '${expected}'`));
});

test("data page title retains the important source terms", () => {
  for (const term of [
    "UK Electricity Data",
    "Elexon",
    "NESO",
    "Carbon Intensity",
  ]) {
    assert.ok(expected.includes(term), `missing ${term}`);
  }
});
