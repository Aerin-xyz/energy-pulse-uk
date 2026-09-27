// Values arriving from the historical API are MW for intervals and MWh for days.
// Formatting must never integrate power implicitly or relabel it as energy.
export function chartQuantity(value, basis, digits = 1) {
  if (!["power", "energy"].includes(basis))
    throw new TypeError("Explicit power or energy basis required");
  return typeof value === "number" && Number.isFinite(value)
    ? `${(value / 1000).toFixed(digits)} ${basis === "power" ? "GW" : "GWh"}`
    : "Unavailable";
}
export const FUEL_COLOURS = Object.freeze({
  Wind: "#43d9bf",
  Solar: "#f5d45e",
  Nuclear: "#b49aff",
  Gas: "#62aafa",
  Hydro: "#4bc6ef",
  Biomass: "#a3d783",
  Other: "#a2b4c4",
  Coal: "#b9bfc8",
  PSH: "#bb9afa",
  "Pumped storage": "#bb9afa",
  Biogas: "#a3d783",
  "Energy from waste": "#e9a3c4",
  Marine: "#4bc6ef",
  Geothermal: "#dda58d",
  "Oil / other thermal": "#a2b4c4",
  "Offshore wind": "#43d9bf",
  "Onshore wind": "#43d9bf",
});
export function sourceIndicator({
  timestamp,
  cadenceMinutes = 30,
  now = Date.now(),
  failed = false,
  available = true,
}) {
  const at = Date.parse(timestamp || "");
  if (!available || !Number.isFinite(at) || at > now)
    return {
      state: "unavailable",
      label: "Observation unavailable",
      fresh: false,
    };
  const age = Math.floor((now - at) / 60000);
  if (failed)
    return {
      state: "retained",
      label: `Refresh unavailable · ${age}m old`,
      fresh: false,
    };
  if (age > cadenceMinutes * 2)
    return { state: "delayed", label: `Delayed · ${age}m old`, fresh: false };
  return { state: "current", label: `${age}m old`, fresh: true };
}
