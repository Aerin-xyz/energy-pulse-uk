import test from "node:test";
import assert from "node:assert/strict";
import {
  transfers,
  supplyBalance,
  sourceState,
  cleanWindow,
  futurePeriods,
  fuelValue,
  RENEWABLE_FUELS,
} from "../src/lib/gridMetrics.mjs";
import {
  settlementStart,
  settlementCoordinates,
  expectedPeriods,
} from "../supabase/functions/_shared/settlementTime.mjs";
test("mixed imports and exports use signed net, not the larger gross total", () => {
  const flows = [
    { flow: 2922, status: "live" },
    { flow: -3848, status: "live" },
  ];
  assert.deepEqual(transfers(flows), {
    imports: 2922,
    exports: 3848,
    net: -926,
  });
  assert.equal(supplyBalance(36930, flows, -1208), 34796);
});
test("zero transfers are real data; missing or unavailable inputs cannot become zero demand", () => {
  assert.equal(transfers([{ flow: 0, status: "live" }]).net, 0);
  assert.equal(transfers([{ flow: 0, status: "unavailable" }]).net, null);
  assert.equal(supplyBalance(30000, [], 0), null);
  assert.equal(supplyBalance(30000, [{ flow: 0 }], null), null);
});
test("fresh retrieval does not make a delayed observation live", () => {
  const now = Date.parse("2026-09-12T12:50:00Z");
  assert.equal(sourceState("2026-09-12T11:00Z", 30, now).fresh, false);
  assert.equal(
    sourceState("2026-09-12T13:00Z", 30, now).label,
    "Time unverified",
  );
  assert.equal(sourceState(null, 30, now).fresh, false);
});
test("forecast window excludes past intervals and never crosses a missing half-hour", () => {
  const now = Date.parse("2026-09-12T12:00Z");
  const p = (from, to, n) => ({
    from: `2026-09-12T${from}Z`,
    to: `2026-09-12T${to}Z`,
    intensity: { forecast: n },
  });
  const rows = [
    p("11:30", "12:00", 0),
    p("12:00", "12:30", 0),
    p("13:00", "13:30", 10),
    p("13:30", "14:00", 30),
  ];
  assert.equal(futurePeriods(rows, now).length, 3);
  assert.equal(cleanWindow(rows, 60, now).intensity, 20);
  assert.equal(cleanWindow(rows, 120, now), null);
});
test("renewables include biomass and exclude imports and storage", () => {
  assert.equal(
    fuelValue(
      [
        { name: "Wind", value: 100 },
        { name: "Biomass", value: 20 },
        { name: "PSH", value: 50 },
        { name: "Imports", value: 80 },
      ],
      RENEWABLE_FUELS,
    ),
    120,
  );
});
test("UK settlement days have 46, 48 or 50 periods; BST midnight is previous UTC day", () => {
  assert.equal(expectedPeriods("2026-03-29"), 46);
  assert.equal(expectedPeriods("2026-10-25"), 50);
  assert.equal(expectedPeriods("2026-09-12"), 48);
  assert.equal(settlementStart("2026-09-12", 1), "2026-09-11T23:00:00.000Z");
  assert.equal(settlementStart("2026-09-12", 28), "2026-09-12T12:30:00.000Z");
});

test('observation to GB period accounts for BST and the repeated autumn hour',()=>{
 assert.deepEqual(settlementCoordinates('2026-09-12T12:40Z'),{date:'2026-09-12',period:28});
 assert.deepEqual(settlementCoordinates('2026-10-25T01:30Z'),{date:'2026-10-25',period:6});
});
