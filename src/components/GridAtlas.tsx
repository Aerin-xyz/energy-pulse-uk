import { useAtlasWorkspace } from "@/hooks/useAtlasWorkspace";
import { AtlasInspector } from "./AtlasInspector";
import { NetworkBackdrop, useNetworkGeography } from "./NetworkBackdrop";
import { useGenerationCatalogue } from "@/hooks/useGenerationCatalogue";
import { useAssetOperations } from "./AssetOperations";
import {
  assetView,
  capacityText,
  assetEvidenceLabel,
} from "@/lib/assetExplorer.mjs";
import {
  GenerationMapLayer,
  AssetEvidence,
  useAssetSnapshot,
  assetTime,
  matchingAssets,
} from "./GenerationMapLayer";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Layers, Maximize2, X } from "lucide-react";
import { cables } from "@/data/atlas/interconnectors";
import { useCableFlows } from "@/hooks/useCableFlows";
import { cableReadings } from "@/lib/cableReadings.mjs";
import { CableMapLayer, CableEvidence } from "./CableMapLayer";
import countries from "@/data/atlas/countries.json";
import { sourceState } from "@/lib/gridMetrics.mjs";
import type { CarbonRegion } from "@/hooks/useCarbonOutlook";
type Flow = {
  name: string;
  country: string;
  flow: number;
  status?: string;
  capacity?: number;
  asOf?: string;
};
const endpoints: Record<
  string,
  { point: number[]; landing: number[]; label: string }
> = {
  France: { point: [570, 727], landing: [484, 627], label: "FRANCE" },
  Belgium: { point: [742, 663], landing: [502, 583], label: "BELGIUM" },
  Netherlands: { point: [787, 555], landing: [485, 547], label: "NETHERLANDS" },
  Norway: { point: [726, 130], landing: [426, 373], label: "NORWAY" },
  Denmark: { point: [810, 385], landing: [484, 480], label: "DENMARK" },
  Ireland: { point: [156, 560], landing: [346, 486], label: "IRELAND" },
  "Northern Ireland": {
    point: [198, 406],
    landing: [335, 338],
    label: "N. IRELAND",
  },
};
const centres: Record<number, number[]> = {
  1: [-4.3, 57.4],
  2: [-3.7, 55.8],
  3: [-2.8, 54],
  4: [-1.6, 55],
  5: [-1.4, 53.8],
  6: [-3.5, 53.1],
  7: [-3.8, 51.8],
  8: [-2.2, 52.5],
  9: [-1, 52.9],
  10: [0.8, 52.3],
  11: [-4, 50.7],
  12: [-1.5, 51],
  13: [-0.12, 51.5],
  14: [0.7, 51.1],
};
export function GridAtlas({
  summary,
  flows,
  regions,
  regionFrom,
  regionTo,
  flowTime,
  now,
}: {
  summary?: React.ReactNode;
  flows: Flow[];
  regions: CarbonRegion[];
  regionFrom: string;
  regionTo: string;
  flowTime?: string;
  now: number;
}) {
  const { state, update } = useAtlasWorkspace();
  const {
    mode,
    assetFilter,
    assetSearch,
    pilotOnly,
    minCapacity,
    assetCountry,
    assetAvailability,
    assetSort,
    viewport,
    selected,
    expanded,
    showNetwork,
    panel,
  } = state;
  const field = (key: string) => (value: any) =>
    update((s: any) => ({
      [key]: typeof value === "function" ? value(s[key]) : value,
    }));
  const setMode = (mode: any) =>
    update({ mode, selected: null, panel: null }, "push");
  const setAssetFilter = field("assetFilter"),
    setAssetSearch = field("assetSearch"),
    setPilotOnly = field("pilotOnly"),
    setMinCapacity = field("minCapacity"),
    setAssetCountry = field("assetCountry"),
    setAssetAvailability = field("assetAvailability"),
    setAssetSort = field("assetSort"),
    setShowNetwork = field("showNetwork");
  const setExpanded = (expanded: boolean) => update({ expanded }, "push");
  const setViewport = (value: any) =>
    update(
      (s: any) => ({
        viewport: typeof value === "function" ? value(s.viewport) : value,
      }),
      "silent",
    );
  const catalogue = useGenerationCatalogue(mode === "generation");
  const assets = catalogue.assets;
  const operations = useAssetOperations(mode === "generation");
  const cableFeed = useCableFlows();
  const network = useNetworkGeography();
  const { snapshot: assetSnapshot, error: assetError } = useAssetSnapshot(
    mode === "generation",
  );
  const [listLimit, setListLimit] = useState(60);
  const stageRef = useRef<HTMLElement>(null),
    expandRef = useRef<HTMLButtonElement>(null),
    originRef = useRef<HTMLElement | null>(null);
  const returnPanel = useRef<string | null>(null);
  const previousPanel = useRef(panel);
  useEffect(() => {
    if (previousPanel.current && !panel && originRef.current?.isConnected)
      originRef.current.focus({ preventScroll: true });
    previousPanel.current = panel;
  }, [panel]);

  const [markerScale, setMarkerScale] = useState(1);
  const mapRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = mapRef.current;
    if (!svg) return;
    const resize = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect();
      setMarkerScale(
        Math.max(
          1,
          Math.max(500 / Math.max(1, r.width), 800 / Math.max(1, r.height)),
        ),
      );
    });
    resize.observe(svg);
    return () => resize.disconnect();
  }, []);
  const drag = useRef<{
    x: number;
    y: number;
    cx: number;
    cy: number;
    scale: number;
    moved: boolean;
  } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const openPanel = (panel: string) => {
    originRef.current = document.activeElement as HTMLElement;
    update({ panel, selected: null }, "push");
  };
  const closePanel = () => {
    const back = panel === "detail" ? returnPanel.current : null;
    update({ panel: back, selected: null }, "push");
    requestAnimationFrame(() => {
      const result =
        back &&
        document.querySelector<HTMLElement>(
          '.atlas-inspector [data-asset-id="' +
            CSS.escape(selected || "") +
            '"]',
        );
      if (result) result.focus({ preventScroll: true });
      else if (originRef.current?.isConnected)
        originRef.current.focus({ preventScroll: true });
      else
        stageRef.current
          ?.querySelector<HTMLElement>(".atlas-search-open,.asset-search input")
          ?.focus({ preventScroll: true });
    });
  };
  const setSelected = (id: string | null) => {
    if (!id) {
      update({ selected: null, panel: panel === "detail" ? null : panel });
      return;
    }
    originRef.current = document.activeElement as HTMLElement;
    returnPanel.current =
      panel === "search" || panel === "browse" ? panel : null;
    const a = assets.find((a) => a.id === id);
    update(
      {
        selected: id,
        panel: "detail",
        ...(a
          ? {
              viewport: assetView(
                (a.longitude + 12) * 40,
                (61 - a.latitude) * 63,
                Math.max(3, viewport.zoom),
              ),
            }
          : {}),
      },
      "push",
    );
  };
  const zoom = (factor: number) =>
    update({
      viewport: assetView(viewport.cx, viewport.cy, viewport.zoom * factor),
    });
  const pan = (x: number, y: number) =>
    update({
      viewport: assetView(
        viewport.cx + x * viewport.w * 0.25,
        viewport.cy + y * viewport.h * 0.25,
        viewport.zoom,
      ),
    });
  const resetFilters = () =>
    update(
      {
        assetFilter: "All",
        assetSearch: "",
        pilotOnly: false,
        minCapacity: 0,
        assetCountry: "All GB",
        assetAvailability: "All data",
        assetSort: "name",
      },
      "push",
    );
  const filtered = matchingAssets(assetFilter, assetSearch, pilotOnly, {
    assets,
    country: assetCountry,
    availability: assetAvailability,
    snapshot: assetSnapshot,
    operations: operations.data,
    minCapacity,
    sort: assetSort,
  });
  const activeFilters = [
    assetFilter !== "All" && assetFilter,
    assetCountry !== "All GB" && assetCountry,
    minCapacity > 0 && `Installed > ${minCapacity} MW`,
    assetAvailability !== "All data" && assetAvailability,
    pilotOnly && "Reviewed sites",
  ].filter(Boolean);
  useEffect(() => {
    setListLimit(60);
  }, [
    assetSearch,
    assetFilter,
    assetCountry,
    assetAvailability,
    minCapacity,
    pilotOnly,
  ]);
  const linked = useRef<string | null>(null);
  useEffect(() => {
    const a = assets.find((a) => a.id === selected);
    if (
      a &&
      linked.current !== selected &&
      !new URLSearchParams(location.search).has("camera")
    ) {
      linked.current = selected;
      update(
        {
          viewport: assetView(
            (a.longitude + 12) * 40,
            (61 - a.latitude) * 63,
            3,
          ),
        },
        "replace",
      );
    }
  }, [assets, selected]);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [expanded]);
  const fresh = sourceState(flowTime, 30, now).fresh;
  const grouped = Object.entries(endpoints).map(([country, geo]) => {
    const rows = flows.filter((f) => f.country === country);
    const known =
      rows.length > 0 &&
      rows.every(
        (r) =>
          Number.isFinite(r.flow) &&
          r.status !== "unavailable" &&
          r.status !== "offline",
      );
    return {
      country,
      ...geo,
      rows,
      known,
      flow: rows.reduce((s, r) => s + (r.flow || 0), 0),
    };
  });
  const detail = grouped.find((g) => g.country === selected);
  const cable =
    mode === "cables" ? cables.find((c) => c.id === selected) : undefined;
  const region = regions.find((r) => r.shortname === selected);
  return (
    <section
      ref={stageRef}
      className={
        expanded
          ? "atlas-stage immersive-atlas expanded"
          : "atlas-stage immersive-atlas"
      }
      id="grid-map"
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label="Great Britain electricity atlas"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (panel) closePanel();
          else {
            setExpanded(false);
            expandRef.current?.focus();
          }
        }
        if (expanded && e.key === "Tab") {
          const nodes = Array.from(
            stageRef.current?.querySelectorAll<HTMLElement>(
              'button, input, select, summary, a[href], [tabindex="0"]',
            ) || [],
          ).filter((el) => el.getClientRects().length);
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="atlas-toolbar">
        <span>
          <Layers size={14} />{" "}
          {mode === "generation" ? "Generation Atlas" : "Grid context"}
        </span>
        <div className="atlas-tabs" aria-label="Map layer">
          {(["cables", "generation", "connections", "carbon"] as const).map(
            (m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                }}
              >
                {m === "generation"
                  ? "Generation"
                  : m === "cables"
                    ? "Cables"
                    : m === "connections"
                      ? "Connections"
                      : "Regional carbon"}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="map-search-row">
        {mode === "generation" && (
          <>
            <label className="asset-search atlas-desktop-search">
              <span>Find a generation site</span>
              <input
                type="search"
                placeholder="Find a site or place…"
                value={assetSearch}
                onChange={(e) =>
                  update({
                    assetSearch: e.target.value,
                    panel: "search",
                    selected: null,
                  })
                }
                aria-controls={
                  panel === "search" || panel === "browse"
                    ? "atlas-results"
                    : undefined
                }
              />
            </label>
            <button
              className="atlas-search-open"
              onClick={() => openPanel("search")}
              aria-label="Search generation sites"
            >
              Search sites{assetSearch ? `: ${assetSearch}` : ""}
            </button>
          </>
        )}
        <button
          onClick={() =>
            openPanel(mode === "generation" ? "filters" : "browse")
          }
          aria-expanded={panel === "filters"}
        >
          {mode === "generation"
            ? `Filters${activeFilters.length ? ` (${activeFilters.length})` : ""}`
            : "Browse evidence"}
        </button>
        <button
          className="atlas-browse-open"
          onClick={() => openPanel("browse")}
        >
          Browse {mode === "generation" ? "sites" : "evidence"}
        </button>
        <button
          ref={expandRef}
          className="atlas-expand"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <Maximize2 size={16} />
          {expanded ? "Close expanded map" : "Expand map"}
        </button>
      </div>
      {mode === "generation" && (
        <div className="atlas-active-filters" aria-label="Active map filters">
          <button
            onClick={() =>
              update(
                {
                  minCapacity: 100,
                  pilotOnly: false,
                  assetFilter: "All",
                  assetCountry: "All GB",
                  assetAvailability: "All data",
                  assetSearch: "",
                  selected: null,
                },
                "push",
              )
            }
          >
            Sites above 100 MW installed
          </button>
          {activeFilters.map((f) => (
            <span key={String(f)}>{f}</span>
          ))}
          {(activeFilters.length > 0 || assetSearch) && (
            <button onClick={resetFilters}>Clear all filters & search</button>
          )}
        </div>
      )}
      <div
        className={panel ? "atlas-workspace has-inspector" : "atlas-workspace"}
      >
        <div className="map-canvas">
          <div className="network-key">
            <button
              aria-pressed={showNetwork}
              onClick={() => setShowNetwork((v) => !v)}
            >
              Network backdrop {showNetwork ? "on" : "off"}
            </button>
            {showNetwork && (
              <>
                <details>
                  <summary>Map key</summary>
                  <span>
                    <i className="key-400" />
                    400 kV
                  </span>
                  <span>
                    <i className="key-275" />
                    275 kV
                  </span>
                  <span>
                    <i className="key-132" />
                    132 kV · Scotland
                  </span>
                  <span>
                    <i className="key-site" />
                    Generation sites / groups
                  </span>
                  <span>
                    <i className="key-cable" />
                    Interconnectors · schematic
                  </span>
                </details>
                <small>
                  {network.isError
                    ? "Network geography unavailable"
                    : "Mapped infrastructure · not live flows"}
                </small>
              </>
            )}
          </div>
          {mode === "generation" && (
            <div
              className="asset-navigation"
              aria-label="Generation map navigation"
            >
              <button
                onClick={() => zoom(1.5)}
                disabled={viewport.zoom >= 32}
                aria-label="Zoom in on generation assets"
              >
                +
              </button>
              <button
                onClick={() => zoom(1 / 1.5)}
                disabled={viewport.zoom <= 1}
                aria-label="Zoom out of generation assets"
              >
                −
              </button>
              <button onClick={() => setViewport(assetView())}>
                Reset GB view
              </button>
              <span>{viewport.zoom.toFixed(1)}×</span>
              <button onClick={() => pan(-1, 0)} aria-label="Pan west">
                ←
              </button>
              <button onClick={() => pan(0, -1)} aria-label="Pan north">
                ↑
              </button>
              <button onClick={() => pan(0, 1)} aria-label="Pan south">
                ↓
              </button>
              <button onClick={() => pan(1, 0)} aria-label="Pan east">
                →
              </button>
            </div>
          )}
          <p className="atlas-gesture-hint">
            {expanded
              ? "Drag or pinch to explore. Zoom and direction buttons work without dragging."
              : "Scroll the page normally. Expand the map for touch panning and pinch zoom."}
          </p>
          <svg
            ref={mapRef}
            className={
              mode === "generation" ? "atlas-map asset-navigable" : "atlas-map"
            }
            style={{ touchAction: expanded ? "none" : "pan-y pinch-zoom" }}
            onPointerDown={(e) => {
              if (
                mode !== "generation" ||
                (e.pointerType === "touch" && !expanded)
              )
                return;
              touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (touches.current.size === 2) {
                const [a, b] = [...touches.current.values()];
                pinch.current = {
                  distance: Math.hypot(a.x - b.x, a.y - b.y),
                  zoom: viewport.zoom,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
                return;
              }
              const scale = e.currentTarget.getScreenCTM()?.a || 1;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                cx: viewport.cx,
                cy: viewport.cy,
                scale,
                moved: false,
              };
            }}
            onPointerMove={(e) => {
              if (touches.current.has(e.pointerId))
                touches.current.set(e.pointerId, {
                  x: e.clientX,
                  y: e.clientY,
                });
              if (pinch.current && touches.current.size === 2) {
                const [a, b] = [...touches.current.values()],
                  p = pinch.current;
                setViewport((v) =>
                  assetView(
                    v.cx,
                    v.cy,
                    (p.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                      Math.max(1, p.distance),
                  ),
                );
                if (drag.current) drag.current.moved = true;
                return;
              }
              const d = drag.current;
              if (!d || mode !== "generation") return;
              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
                d.moved = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                setViewport(
                  assetView(
                    d.cx - (e.clientX - d.x) / d.scale,
                    d.cy - (e.clientY - d.y) / d.scale,
                    viewport.zoom,
                  ),
                );
              }
            }}
            onPointerUp={(e) => {
              update({}, "replace");
              touches.current.delete(e.pointerId);
              pinch.current = null;
              setTimeout(() => {
                drag.current = null;
              }, 0);
            }}
            onPointerCancel={(e) => {
              touches.current.delete(e.pointerId);
              pinch.current = null;
              drag.current = null;
            }}
            onClickCapture={(e) => {
              if (drag.current?.moved) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            viewBox={
              mode === "generation"
                ? `${viewport.cx - viewport.w / 2} ${viewport.cy - viewport.h / 2} ${viewport.w} ${viewport.h}`
                : mode === "cables"
                  ? "65 55 855 755"
                  : "65 55 825 720"
            }
            role="group"
            aria-labelledby="atlas-map-title atlas-map-desc"
          >
            <title id="atlas-map-title">
              {mode === "generation"
                ? "Operational Great Britain generation assets"
                : "Great Britain and its electricity connections"}
            </title>
            <desc id="atlas-map-desc">
              Geographic country outlines. Connection lines are schematic, not
              physical cable routes. Generation markers use approximate register
              positions; numbered markers group nearby sites. All values are
              available in the list below the map.
            </desc>
            <defs>
              <pattern
                id="atlas-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#28424b"
                  strokeWidth=".5"
                />
              </pattern>
              <radialGradient id="atlas-sea">
                <stop stopColor="#123842" stopOpacity=".8" />
                <stop offset="1" stopColor="#07151c" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="atlas-land" x2="1" y2="1">
                <stop stopColor="#075381" />
                <stop offset=".55" stopColor="#0b394d" />
                <stop offset="1" stopColor="#123a53" />
              </linearGradient>
              <pattern
                id="atlas-terrain"
                width="9"
                height="9"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r=".7" fill="#38bfee" opacity=".6" />
                <circle cx="6" cy="7" r=".45" fill="#18e1ce" opacity=".4" />
              </pattern>
              <filter id="atlas-glow">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <rect
              x="60"
              y="40"
              width="850"
              height="740"
              fill="url(#atlas-grid)"
              opacity=".45"
            />
            <ellipse
              cx="430"
              cy="415"
              rx="345"
              ry="360"
              fill="url(#atlas-sea)"
            />
            {countries.map((c) => (
              <path
                key={c.name}
                d={c.path}
                className={
                  c.name === "United Kingdom" ? "atlas-land-gb" : "atlas-land"
                }
                fill={
                  c.name === "United Kingdom" ? "url(#atlas-land)" : "#101e27"
                }
              />
            ))}
            {countries
              .filter((c) => c.name === "United Kingdom")
              .map((c) => (
                <path
                  key="terrain"
                  d={c.path}
                  fill="url(#atlas-terrain)"
                  pointerEvents="none"
                  aria-hidden="true"
                />
              ))}
            {showNetwork && (
              <NetworkBackdrop
                data={network.data}
                zoom={mode === "generation" ? viewport.zoom : 1}
              />
            )}
            <text
              x="150"
              y="235"
              className="atlas-sea-label"
              transform="rotate(-12 150 235)"
            >
              ATLANTIC OCEAN
            </text>
            <text x="596" y="305" className="atlas-sea-label">
              NORTH SEA
            </text>
            <text x="326" y="266" className="atlas-place">
              SCOTLAND
            </text>
            <text x="377" y="476" className="atlas-place">
              ENGLAND
            </text>
            <text x="285" y="541" className="atlas-place">
              WALES
            </text>
            {mode === "cables" && (
              <CableMapLayer
                rows={cableFeed.rows}
                now={now}
                selected={selected}
                select={setSelected}
              />
            )}
            {mode === "connections" &&
              grouped.map((g) => {
                const [x, y] = g.point,
                  [lx, ly] = g.landing;
                const d = `M ${lx} ${ly} Q ${(lx + x) / 2 + 55} ${(ly + y) / 2 - 65} ${x} ${y}`;
                return (
                  <g
                    key={g.country}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${g.country} connection`}
                    onClick={() => setSelected(g.country)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(g.country);
                      }
                    }}
                    className={
                      selected === g.country
                        ? "atlas-connection selected"
                        : "atlas-connection"
                    }
                  >
                    <path
                      d={d}
                      className={g.known ? "atlas-arc" : "atlas-arc unknown"}
                      strokeWidth={
                        g.known
                          ? Math.max(1, Math.min(4, Math.abs(g.flow) / 900))
                          : 1
                      }
                    />
                    {g.known && g.flow !== 0 && (
                      <>
                        <path
                          d={d}
                          className="atlas-arc-glow"
                          filter="url(#atlas-glow)"
                        />
                        {fresh && (
                          <circle
                            r="3"
                            fill="#8af4d9"
                            className="atlas-traveller"
                          >
                            <animateMotion
                              dur="6s"
                              repeatCount="indefinite"
                              path={d}
                              keyPoints={g.flow > 0 ? "1;0" : "0;1"}
                              keyTimes="0;1"
                              calcMode="linear"
                            />
                          </circle>
                        )}
                      </>
                    )}
                    {fresh && g.known && g.flow !== 0 && (
                      <circle
                        className="cc-node-pulse"
                        cx={lx}
                        cy={ly}
                        r="10"
                        fill="none"
                        stroke="#46ffe1"
                        strokeWidth="1"
                        aria-hidden="true"
                      />
                    )}
                    <circle cx={lx} cy={ly} r="3" fill="#72d9bd" />
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill={g.known ? "#7ae5c8" : "#516770"}
                    />
                    <text
                      x={x}
                      y={y - 17}
                      textAnchor="middle"
                      className="atlas-country"
                    >
                      {g.label}
                    </text>
                    <text
                      x={x}
                      y={y + 24}
                      textAnchor="middle"
                      className="atlas-flow-value"
                    >
                      {g.known
                        ? `${(Math.abs(g.flow) / 1000).toFixed(1)} GW ${g.flow > 0 ? "→ GB" : g.flow < 0 ? "from GB" : "balanced"}`
                        : "Unavailable"}
                    </text>
                  </g>
                );
              })}
            {mode === "connections" &&
              regions
                .filter((r) => [1, 3, 5, 7, 10, 11].includes(r.regionid))
                .map((r) => {
                  const c = centres[r.regionid];
                  if (!c) return null;
                  const x = (c[0] + 12) * 40,
                    y = (61 - c[1]) * 63;
                  const left = [1, 3, 7, 11].includes(r.regionid);
                  const bx = left ? x - 155 : x + 28;
                  const by = y - 29;
                  return (
                    <g
                      className="cc-region-card"
                      key={r.regionid}
                      pointerEvents="none"
                    >
                      <line
                        x1={x}
                        y1={y}
                        x2={left ? bx + 135 : bx}
                        y2={by + 20}
                      />
                      <circle cx={x} cy={y} r="8" fill="#13edca" opacity=".2" />
                      <circle cx={x} cy={y} r="2.5" fill="#72ffe0" />
                      <rect x={bx} y={by} width="135" height="43" rx="4" />
                      <text x={bx + 8} y={by + 13}>
                        {r.shortname}
                      </text>
                      <text
                        className="cc-region-reading"
                        x={bx + 8}
                        y={by + 29}
                      >
                        {r.intensity.forecast}
                        <tspan fontSize="8" fontWeight="400">
                          {" "}
                          gCO₂/kWh forecast
                        </tspan>
                      </text>
                    </g>
                  );
                })}
            {mode === "carbon" &&
              regions.map((r) => {
                const c = centres[r.regionid];
                if (!c) return null;
                const x = (c[0] + 12) * 40,
                  y = (61 - c[1]) * 63;
                return (
                  <g
                    key={r.regionid}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${r.shortname} regional forecast`}
                    onClick={() => setSelected(r.shortname)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(r.shortname);
                      }
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="16"
                      fill={r.intensity.forecast < 100 ? "#194c43" : "#624d2c"}
                      stroke={
                        r.intensity.forecast < 100 ? "#78ddbd" : "#e4bf75"
                      }
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill="#f1f7f5"
                      fontSize="12"
                    >
                      {r.intensity.forecast}
                    </text>
                  </g>
                );
              })}
            {mode === "generation" && (
              <g className="generation-cable-context">
                <CableMapLayer
                  rows={cableFeed.rows}
                  now={now}
                  selected={null}
                  select={(id) => {
                    originRef.current = document.activeElement as HTMLElement;
                    returnPanel.current = null;
                    update(
                      { mode: "cables", selected: id, panel: "detail" },
                      "push",
                    );
                  }}
                />
              </g>
            )}
            {mode === "generation" && (
              <GenerationMapLayer
                markerScale={markerScale}
                filter={assetFilter}
                search={assetSearch}
                pilotOnly={pilotOnly}
                selected={selected}
                onSelect={setSelected}
                snapshot={assetSnapshot}
                zoom={viewport.zoom}
                country={assetCountry}
                availability={assetAvailability}
                minCapacity={minCapacity}
                viewport={viewport}
                operations={operations.data}
              />
            )}
          </svg>
        </div>
        {panel && (
          <AtlasInspector
            kind={panel}
            title={
              panel === "detail"
                ? "Source evidence"
                : panel === "filters"
                  ? "Filters & layers"
                  : panel === "search"
                    ? "Find a generation site"
                    : "Browse source evidence"
            }
            onClose={closePanel}
          >
            {panel === "filters" ? (
              <div className="map-filter-content">
                {" "}
                {mode === "generation" && (
                  <div className="asset-controls">
                    <p>
                      {pilotOnly
                        ? `${assets.filter((a) => a.releaseSelection).length} reviewed GB sites`
                        : `${assets.length.toLocaleString()} operational GB register entries`}{" "}
                      ·{" "}
                      <strong>
                        notified schedules & delayed measured history
                      </strong>
                    </p>
                    <button
                      className="asset-scope"
                      aria-pressed={pilotOnly}
                      onClick={() => {
                        setPilotOnly(!pilotOnly);
                        setSelected(null);
                      }}
                    >
                      {pilotOnly
                        ? "Show all operational assets"
                        : "Reviewed sites only"}
                    </button>
                    <div aria-label="Generation type">
                      {["All", ...new Set(assets.map((a) => a.type))].map(
                        (t) => (
                          <button
                            key={t}
                            aria-pressed={assetFilter === t}
                            onClick={() => {
                              setAssetFilter(t);
                              setSelected(null);
                            }}
                          >
                            {t}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
                {mode === "generation" && (
                  <>
                    <div className="asset-refine">
                      <label>
                        Geography
                        <select
                          aria-label="Asset geography"
                          value={assetCountry}
                          onChange={(e) => {
                            setAssetCountry(e.target.value);
                            setSelected(null);
                          }}
                        >
                          {["All GB", "England", "Scotland", "Wales"].map(
                            (c) => (
                              <option key={c}>{c}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Evidence
                        <select
                          aria-label="Asset data availability"
                          value={assetAvailability}
                          onChange={(e) => {
                            setAssetAvailability(e.target.value);
                            setSelected(null);
                          }}
                        >
                          {[
                            "All data",
                            "Metered history",
                            "Notified schedule",
                            "Capacity only",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Capacity
                        <select
                          aria-label="Minimum asset capacity"
                          value={minCapacity}
                          onChange={(e) => {
                            setMinCapacity(Number(e.target.value));
                            setSelected(null);
                          }}
                        >
                          <option value={0}>All capacities</option>
                          <option value={1}>Above 1 MW</option>
                          <option value={10}>Above 10 MW</option>
                          <option value={100}>Above 100 MW</option>
                          <option value={500}>Above 500 MW</option>
                        </select>
                      </label>
                      <label>
                        Order
                        <select
                          aria-label="Asset order"
                          value={assetSort}
                          onChange={(e) => setAssetSort(e.target.value)}
                        >
                          <option value="name">Name</option>
                          <option value="capacity">Capacity</option>
                        </select>
                      </label>
                    </div>
                    <p className="asset-legend">
                      Solid rings: notified or dated output—see label · dotted
                      rings: no linked output. Drag to explore; zoom separates
                      nearby sites.
                    </p>
                  </>
                )}
                <button onClick={resetFilters}>
                  Clear all filters & search
                </button>
                <button className="map-filter-close" onClick={closePanel}>
                  Show map
                </button>
              </div>
            ) : panel === "detail" ? (
              <>
                {" "}
                {!cable && mode !== "generation" && <h3>{selected}</h3>}
                {mode === "generation" ? (
                  <AssetEvidence
                    id={selected}
                    snapshot={assetSnapshot}
                    error={assetError}
                    onSelect={setSelected}
                  />
                ) : cable ? (
                  <CableEvidence
                    cable={cable}
                    rows={cableFeed.rows}
                    now={now}
                    error={cableFeed.error}
                  />
                ) : detail ? (
                  <>
                    <p>
                      {detail.known
                        ? `${(Math.abs(detail.flow) / 1000).toFixed(2)} GW ${detail.flow > 0 ? "net into GB" : detail.flow < 0 ? "net out of GB" : "balanced"}`
                        : "Flow unavailable"}
                    </p>
                    <ul>
                      {detail.rows.map((r) => (
                        <li key={r.name}>
                          {r.name}:{" "}
                          {Number.isFinite(r.flow) ? `${r.flow} MW` : "unknown"}{" "}
                          · {r.status || "status unverified"}
                        </li>
                      ))}
                    </ul>
                    <small>
                      ENTSO-E / Elexon · {sourceState(flowTime, 30, now).label}.
                      Country aggregate; not individual cable telemetry.
                      Northern Ireland is outside GB totals.
                    </small>
                  </>
                ) : region ? (
                  <>
                    <p>{region.intensity.forecast} gCO₂/kWh · forecast</p>
                    <small>
                      Carbon Intensity API · {regionFrom} – {regionTo}. Regions
                      are represented by approximate centres, not administrative
                      boundaries.
                    </small>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {mode === "generation" && (
                  <label className="asset-search">
                    <span>Find a generation site</span>
                    <input
                      type="search"
                      placeholder="Find a site or place…"
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      aria-controls="atlas-results"
                    />
                  </label>
                )}
                <div id="atlas-results">
                  {" "}
                  {mode === "generation" && (
                    <p className="asset-results" role="status">
                      {filtered.length} matching register entries · REPD
                      renewables & DUKES stations · numbered markers group
                      nearby entries
                      {filtered.length === 0
                        ? ". No matching sites; try another search or fuel."
                        : ""}
                    </p>
                  )}
                  <div
                    className="atlas-access-list"
                    data-layer={mode}
                    aria-label={
                      mode === "generation"
                        ? "Select a generation asset"
                        : mode === "cables"
                          ? "Select a cable"
                          : mode === "connections"
                            ? "Select a connection"
                            : "Select a region"
                    }
                  >
                    {mode === "generation"
                      ? filtered.slice(0, listLimit).map((a) => (
                          <button
                            key={a.id}
                            data-asset-id={a.id}
                            aria-pressed={selected === a.id}
                            onClick={() => setSelected(a.id)}
                          >
                            <span>{a.name}</span>
                            <strong>
                              {capacityText(a.installedCapacityMW)} · {a.type}
                            </strong>
                            <small className="asset-data-badge">
                              {assetEvidenceLabel(
                                a,
                                assetSnapshot,
                                operations.data,
                              )}
                            </small>
                          </button>
                        ))
                      : mode === "cables"
                        ? cables.map((c) => {
                            const r = cableReadings(
                              cableFeed.rows,
                              c.code,
                              now,
                            );
                            return (
                              <button
                                key={c.id}
                                aria-label={c.name}
                                onClick={() => setSelected(c.id)}
                                aria-pressed={selected === c.id}
                              >
                                <span>{c.name}</span>
                                <strong>
                                  {r.mw === null
                                    ? "Unavailable"
                                    : `${Math.abs(r.mw)} MW ${r.mw > 0 ? "in" : r.mw < 0 ? "out" : "zero"}`}
                                </strong>
                              </button>
                            );
                          })
                        : mode === "connections"
                          ? grouped.map((g) => (
                              <button
                                key={g.country}
                                onClick={() => setSelected(g.country)}
                                aria-pressed={selected === g.country}
                              >
                                {g.country}
                                <ArrowUpRight size={12} />
                              </button>
                            ))
                          : regions.map((r) => (
                              <button
                                key={r.regionid}
                                onClick={() => setSelected(r.shortname)}
                                aria-pressed={selected === r.shortname}
                              >
                                {r.shortname} · {r.intensity.forecast}g
                              </button>
                            ))}
                  </div>
                  {mode === "generation" && (
                    <div className="asset-catalogue-footnote">
                      {filtered.length > listLimit && (
                        <button onClick={() => setListLimit((n) => n + 60)}>
                          Show 60 more results
                        </button>
                      )}
                      <p>
                        {catalogue.isFetching
                          ? "Loading the official catalogue…"
                          : catalogue.isError
                            ? "Wider catalogue unavailable; retained curated entries shown."
                            : catalogue.data?.metadata.coverage}
                      </p>
                      <p>
                        {catalogue.data?.metadata.retrievedAt && (
                          <>
                            Register retrieved{" "}
                            {new Date(
                              catalogue.data.metadata.retrievedAt,
                            ).toLocaleDateString("en-GB")}
                            .{" "}
                          </>
                        )}
                        Contains public sector information licensed under the
                        Open Government Licence v3.0.{" "}
                        <a href="/data/operational-assets.json">
                          Source register & provenance ↗
                        </a>
                      </p>
                    </div>
                  )}
                  <p className="network-attribution">
                    Network geography ©{" "}
                    <a href="https://www.openstreetmap.org/copyright">
                      OpenStreetMap contributors
                    </a>{" "}
                    · ODbL · community mapped, incomplete.{" "}
                    <a href="/data/network-geography.json">
                      Download geometry & provenance
                    </a>
                    {network.data?.asOf && (
                      <>
                        {" "}
                        · snapshot{" "}
                        {new Date(network.data.asOf).toLocaleDateString(
                          "en-GB",
                        )}
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </AtlasInspector>
        )}
      </div>
      {summary}
      <div className="atlas-map-note">
        <span className="atlas-evidence-mark" aria-hidden="true" />{" "}
        {mode === "generation"
          ? `Elexon metered snapshot · ${assetSnapshot.points.length ? assetTime(assetSnapshot.points.at(-1)!.from) + " UK" : "Output unavailable"} · approximate sites`
          : mode === "cables"
            ? "Elexon · mint imports / violet exports · approximate terminals & schematic paths"
            : mode === "connections"
              ? "Country aggregates · schematic flows · labels: carbon forecasts"
              : "Regional forecasts · gCO₂/kWh · approximate region centres"}
      </div>
      {mode === "carbon" && !regions.length && (
        <p className="atlas-map-empty">
          Regional forecast unavailable. The map remains geographic context
          only.
        </p>
      )}
      <p className="atlas-attribution">
        Country outlines:{" "}
        <a href="https://www.naturalearthdata.com/about/terms-of-use/">
          Natural Earth
        </a>{" "}
        (public domain). Northern Ireland operates in the separate all-island
        electricity market. Contains BMRS data © Elexon Limited copyright and
        database right 2026.{" "}
        <a href="https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/">
          BMRS licence
        </a>
        .{" "}
        {mode === "generation" && (
          <>
            Asset records: DESNZ,{" "}
            <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">
              Open Government Licence v3.0
            </a>
            .
          </>
        )}
      </p>
    </section>
  );
}
