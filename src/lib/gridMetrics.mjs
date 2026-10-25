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
  // Identical duplicates are harmless; conflicting observations without revision
  // metadata are unknown, never an opportunity to choose the lower forecast.
  const intervals = new Map();
  for (const row of Array.isArray(periods) ? periods : []) {
    const from = Date.parse(row?.from), to = Date.parse(row?.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < now || to <= from) continue;
    const previous = intervals.get(from);
    const valid = finite(row.intensity?.forecast) && row.intensity.forecast >= 0;
    if (!valid || (previous && (previous.to !== row.to || previous.intensity.forecast !== row.intensity.forecast))) intervals.set(from, null);
    else if (!intervals.has(from)) intervals.set(from, row);
  }
  return [...intervals.values()].filter(Boolean).sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
}
export function cleanWindow(periods, durationMinutes = 120, now = Date.now()) {
  if (!finite(durationMinutes) || durationMinutes <= 0 || !finite(now)) return null;
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

export function forecastWindowState(periods, durationMinutes = 120, now = Date.now(), { error = false, loading = false } = {}) {
  const rows = futurePeriods(periods, now);
  const horizon = rows.length ? { from: rows[0].from, to: rows.reduce((latest, r) => Date.parse(r.to) > Date.parse(latest) ? r.to : latest, rows[0].to) } : null;
  const result = { periods: rows, horizon, window: null };
  if (loading && !rows.length) return { ...result, status: 'loading', reason: 'Loading the carbon forecast…' };
  if (error) return { ...result, status: 'unavailable', reason: 'Forecast refresh unavailable. No valid window can be recommended.' };
  const supplied = Array.isArray(periods) ? periods : [];
  if (!rows.length) {
    const expired = supplied.length > 0 && supplied.every(r => Number.isFinite(Date.parse(r?.to)) && Date.parse(r.to) <= now);
    return { ...result, status: expired ? 'expired' : 'unavailable', reason: expired ? 'The forecast has expired. No valid future window is available.' : 'No valid future forecast periods are available.' };
  }
  const window = cleanWindow(rows, durationMinutes, now);
  return window
    ? { ...result, status: 'available', window, reason: 'Duration-weighted mean; equal forecasts choose the earliest starting window.' }
    : { ...result, status: 'incomplete', reason: `No complete future ${durationMinutes / 60}-hour window fits the available forecast. Missing or conflicting periods are not filled.` };
}
