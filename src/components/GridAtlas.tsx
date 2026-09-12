import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Layers, Maximize2, X } from "lucide-react";
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
  flows,
  regions,
  regionFrom,
  regionTo,
  flowTime,
  now,
}: {
  flows: Flow[];
  regions: CarbonRegion[];
  regionFrom: string;
  regionTo: string;
  flowTime?: string;
  now: number;
}) {
  const [mode, setMode] = useState<"connections" | "carbon">("connections");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    expandRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
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
  const region = regions.find((r) => r.shortname === selected);
  return (
    <section
      ref={stageRef}
      className={expanded ? "atlas-stage expanded" : "atlas-stage"}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label="Great Britain electricity atlas"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (selected) { setSelected(null); expandRef.current?.focus(); }
          else setExpanded(false);
        }
        if (expanded && e.key === 'Tab') {
          const nodes = Array.from(stageRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]') || []).filter(el => el.getClientRects().length);
          const first=nodes[0], last=nodes[nodes.length-1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}
    >
      <div className="atlas-toolbar">
        <span>
          <Layers size={14} /> THE ELECTRICITY ATLAS
        </span>
        <div className="atlas-tabs" aria-label="Map layer">
          {(["connections", "carbon"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setSelected(null);
              }}
            >
              {m === "connections" ? "Connections" : "Regional carbon"}
            </button>
          ))}
        </div>
      </div>
      <svg
        className="atlas-map"
        viewBox="65 55 825 720"
        role="group"
        aria-labelledby="atlas-map-title atlas-map-desc"
      >
        <title id="atlas-map-title">
          Great Britain and its electricity connections
        </title>
        <desc id="atlas-map-desc">
          Geographic country outlines. Connection lines are schematic, not
          physical cable routes. All values are available in the list below the
          map.
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
            <stop stopColor="#163d42" />
            <stop offset="1" stopColor="#0e272e" />
          </linearGradient>
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
        <ellipse cx="430" cy="415" rx="345" ry="360" fill="url(#atlas-sea)" />
        {countries.map((c) => (
          <path
            key={c.name}
            d={c.path}
            className={
              c.name === "United Kingdom" ? "atlas-land-gb" : "atlas-land"
            }
            fill={c.name === "United Kingdom" ? "url(#atlas-land)" : "#101e27"}
          />
        ))}
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
                      <circle r="3" fill="#8af4d9" className="atlas-traveller">
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
                  stroke={r.intensity.forecast < 100 ? "#78ddbd" : "#e4bf75"}
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
      </svg>
      <div className="atlas-map-note">
        <span className="atlas-dot" />{" "}
        {mode === "connections"
          ? "Schematic connections · positive flow into GB"
          : "Regional forecasts · gCO₂/kWh · approximate region centres"}
      </div>
      {mode === "carbon" && !regions.length && (
        <p className="atlas-map-empty">
          Regional forecast unavailable. The map remains geographic context
          only.
        </p>
      )}
      <div className="atlas-map-actions">
        <button
          ref={expandRef}
          aria-expanded={expanded}
          onClick={() => {setSelected(null);setExpanded(!expanded)}}
        >
          <Maximize2 size={13} /> {expanded ? 'Close expanded map' : 'Expand map'}
        </button>
        <a href="/carbon-intensity/">
          Check a postcode <ArrowUpRight size={13} />
        </a>
      </div>
      <div
        className="atlas-access-list"
        aria-label={
          mode === "connections" ? "Select a connection" : "Select a region"
        }
      >
        {mode === "connections"
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
      {selected && (
        <div
          className="atlas-map-detail"
          role="region"
          aria-label="Selected map evidence"
        >
          <button
            className="atlas-close"
            onClick={() => setSelected(null)}
            aria-label="Close map detail"
          >
            <X size={16} />
          </button>
          <h3>{selected}</h3>
          {detail ? (
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
                    {Number.isFinite(r.flow) ? `${r.flow} MW` : "unknown"} ·{" "}
                    {r.status || "status unverified"}
                  </li>
                ))}
              </ul>
              <small>
                ENTSO-E / Elexon · {sourceState(flowTime, 30, now).label}.
                Country aggregate; not individual cable telemetry. Northern
                Ireland is outside GB totals.
              </small>
            </>
          ) : region ? (
            <>
              <p>{region.intensity.forecast} gCO₂/kWh · forecast</p>
              <small>
                Carbon Intensity API · {regionFrom} – {regionTo}. Regions are
                represented by approximate centres, not administrative
                boundaries.
              </small>
            </>
          ) : null}
        </div>
      )}
      <p className="atlas-attribution">
        Country outlines:{" "}
        <a href="https://www.naturalearthdata.com/about/terms-of-use/">
          Natural Earth
        </a>{" "}
        (public domain). Northern Ireland operates in the separate all-island
        electricity market.
      </p>
    </section>
  );
}
