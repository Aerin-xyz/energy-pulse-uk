import { assetView } from "./assetExplorer.mjs";
export const ATLAS_DEFAULTS = {
  mode: "generation",
  assetFilter: "All",
  assetSearch: "",
  pilotOnly: false,
  minCapacity: 0,
  assetCountry: "All GB",
  assetAvailability: "All data",
  assetSort: "name",
  showNetwork: true,
  selected: null,
  panel: null,
  expanded: false,
  viewport: assetView(),
};
const keys = {
  mode: "layer",
  assetFilter: "fuel",
  assetSearch: "q",
  minCapacity: "capacity",
  assetCountry: "country",
  assetAvailability: "evidence",
  assetSort: "order",
};
export function readAtlasState(search, fallback = ATLAS_DEFAULTS) {
  const p = new URLSearchParams(search),
    s = { ...ATLAS_DEFAULTS, ...fallback };
  if (
    ![...p.keys()].some((k) =>
      [
        ...Object.values(keys),
        "asset",
        "selection",
        "camera",
        "panel",
        "expanded",
        "reviewed",
        "network",
      ].includes(k),
    )
  )
    return s;
  Object.assign(s, ATLAS_DEFAULTS);
  for (const [key, param] of Object.entries(keys))
    if (p.has(param)) s[key] = p.get(param).slice(0, 160);
  if (!["generation", "cables", "connections", "carbon"].includes(s.mode))
    s.mode = "generation";
  s.minCapacity = [0, 1, 10, 100, 500].includes(Number(s.minCapacity))
    ? Number(s.minCapacity)
    : 0;
  s.pilotOnly = p.get("reviewed") === "1";
  s.showNetwork = p.get("network") !== "0";
  s.expanded = p.get("expanded") === "1";
  s.selected = p.get("asset") || p.get("selection") || null;
  s.panel = s.selected
    ? "detail"
    : ["search", "filters", "browse"].includes(p.get("panel"))
      ? p.get("panel")
      : null;
  const camera = (p.get("camera") || "").split(",").map(Number);
  if (camera.length === 3 && camera.every(Number.isFinite))
    s.viewport = assetView(...camera);
  return s;
}
export function atlasSearch(state, previous = "") {
  const p = new URLSearchParams(previous);
  for (const key of [
    ...Object.values(keys),
    "asset",
    "selection",
    "camera",
    "panel",
    "expanded",
    "reviewed",
    "network",
  ])
    p.delete(key);
  for (const [key, param] of Object.entries(keys))
    if (state[key] !== ATLAS_DEFAULTS[key]) p.set(param, String(state[key]));
  // Always identify an atlas state so Back can restore even the default view.
  p.set("layer", state.mode);
  if (state.selected && !state.selected.startsWith("cluster:"))
    p.set(state.mode === "generation" ? "asset" : "selection", state.selected);
  if (state.panel && state.panel !== "detail") p.set("panel", state.panel);
  if (state.pilotOnly) p.set("reviewed", "1");
  if (!state.showNetwork) p.set("network", "0");
  if (state.expanded) p.set("expanded", "1");
  const { cx, cy, zoom } = state.viewport;
  p.set("camera", [cx, cy, zoom].map((v) => Number(v.toFixed(3))).join(","));
  return "?" + p.toString();
}
