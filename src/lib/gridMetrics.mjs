// Shared by browser and static generation. Version changes when meaning changes.
export const DEFINITION_VERSION = "gb-domestic-v1";
export const RENEWABLE_FUELS = ["Wind", "Solar", "Hydro", "Biomass"];
export const LOW_CARBON_FUELS = [...RENEWABLE_FUELS, "Nuclear"];
export const finite = (value) =>
  typeof value === "number" && Number.isFinite(value);
export const fuelValue = (mix, names) =>
  (mix || [])
    .filter((x) => names.includes(x.name))
    .reduce((n, x) => n + (finite(x.value) ? x.value : 0), 0);
export function transfers(flows) {
  const known =
    Array.isArray(flows) &&
    flows.length > 0 &&
    flows.every(
      (x) =>
        finite(x.flow) && x.status !== "unavailable" && x.status !== "offline",
    );
  if (!known) return { imports: null, exports: null, net: null };
  const imports = flows.reduce((n, x) => n + Math.max(0, x.flow), 0);
  const exports = flows.reduce((n, x) => n + Math.max(0, -x.flow), 0);
  return { imports, exports, net: imports - exports };
}
export function supplyBalance(generation, flows, storage) {
  const net = transfers(flows).net;
  return finite(generation) && finite(net) && finite(storage)
    ? generation + net + storage
    : null;
}
export function sourceState(timestamp, cadenceMinutes = 30, now = Date.now()) {
  const t = Date.parse(timestamp || "");
  if (!Number.isFinite(t) || t > now)
    return { label: "Time unverified", fresh: false, age: null };
  const age = Math.floor((now - t) / 60000);
  return {
    label: age > cadenceMinutes * 2 ? `Delayed · ${age}m old` : `${age}m old`,
    fresh: age <= cadenceMinutes * 2,
    age,
  };
}
export function futurePeriods(periods, now = Date.now()) {
  return (periods || [])
    .filter(
      (x) =>
        Date.parse(x.from) >= now &&
        Date.parse(x.to) > Date.parse(x.from) &&
        finite(x.intensity?.forecast),
    )
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
}
export function cleanWindow(periods, durationMinutes = 120, now = Date.now()) {
  const rows = futurePeriods(periods, now);
  let best = null;
  for (let i = 0; i < rows.length; i++) {
    let minutes = 0,
      weighted = 0,
      end = Date.parse(rows[i].from);
    for (let k = i; k < rows.length && minutes < durationMinutes; k++) {
      const r = rows[k];
      if (Date.parse(r.from) !== end) break;
      const use = Math.min(
        (Date.parse(r.to) - end) / 60000,
        durationMinutes - minutes,
      );
      minutes += use;
      weighted += r.intensity.forecast * use;
      end += use * 60000;
    }
    if (
      minutes === durationMinutes &&
      (!best || weighted / minutes < best.intensity)
    )
      best = {
        from: rows[i].from,
        to: new Date(end).toISOString(),
        intensity: weighted / minutes,
      };
  }
  return best;
}
