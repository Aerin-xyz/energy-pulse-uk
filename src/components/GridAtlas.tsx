import {assets, GenerationMapLayer, AssetEvidence, useAssetSnapshot, assetTime, matchingAssets} from './GenerationMapLayer';
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
  const [mode, setMode] = useState<"cables" | "connections" | "carbon" | "generation">("cables");
  const cableFeed = useCableFlows();
  const [assetFilter,setAssetFilter]=useState("All");
  const [assetSearch,setAssetSearch]=useState("");
  const [pilotOnly,setPilotOnly]=useState(true);
  const {snapshot:assetSnapshot,error:assetError}=useAssetSnapshot(mode === "generation");
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
  const cable = mode === "cables" ? cables.find(c=>c.id===selected) : undefined;
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
          const nodes = Array.from(stageRef.current?.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]') || []).filter(el => el.getClientRects().length);
          const first=nodes[0], last=nodes[nodes.length-1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}
    >
      <div className="atlas-toolbar">
        <span>
          <Layers size={14} /> {mode === "generation" ? "Generation Atlas" : "Live Grid Map"}
        </span>
        <div className="atlas-tabs" aria-label="Map layer">
          {(["cables", "generation", "connections", "carbon"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setSelected(null);
              }}
            >
              {m === "generation" ? "Generation" : m === "cables" ? "Cables" : m === "connections" ? "Connections" : "Regional carbon"}
            </button>
          ))}
        </div>
      </div>
      {mode === "generation" && <div className="asset-controls"><p>{pilotOnly ? "6 reviewed GB sites" : `${assets.length} catalogue sites · matches may be unreviewed`} · <strong>metered history, not live</strong></p><button className="asset-scope" aria-pressed={!pilotOnly} onClick={()=>{setPilotOnly(!pilotOnly);setSelected(null)}}>{pilotOnly?"Show existing 47-site catalogue":"Return to reviewed selection"}</button><label className="asset-search"><span>Find a generation site</span><input type="search" placeholder="Search sites, fuels or countries" value={assetSearch} onChange={e=>{setAssetSearch(e.target.value);setSelected(null)}}/></label><div aria-label="Generation type">{["All",...new Set(assets.map(a=>a.type))].map(t=><button key={t} aria-pressed={assetFilter===t} onClick={()=>{setAssetFilter(t);setSelected(null)}}>{t}</button>)}</div></div>}
      <svg
        className="atlas-map"
        viewBox={mode === "generation" ? "155 80 520 650" : mode === "cables" ? "65 55 855 755" : "65 55 825 720"}
        role="group"
        aria-labelledby="atlas-map-title atlas-map-desc"
      >
        <title id="atlas-map-title">
          {mode === "generation" ? "Great Britain generation sites above 500 MW installed" : "Great Britain and its electricity connections"}
        </title>
        <desc id="atlas-map-desc">
          Geographic country outlines. Connection lines are schematic, not
          physical cable routes. Generation markers use approximate register positions; numbered markers group nearby sites. All values are available in the list below the
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
            <stop stopColor="#075381" />
            <stop offset=".55" stopColor="#0b394d" /><stop offset="1" stopColor="#123a53" />
          </linearGradient>
          <pattern id="atlas-terrain" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#38bfee" opacity=".6"/><circle cx="6" cy="7" r=".45" fill="#18e1ce" opacity=".4"/></pattern>
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
        {countries.filter(c=>c.name==='United Kingdom').map(c=><path key="terrain" d={c.path} fill="url(#atlas-terrain)" pointerEvents="none" aria-hidden="true"/>)}
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
        {mode === "cables" && <CableMapLayer rows={cableFeed.rows} now={now} selected={selected} select={setSelected}/>}
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
                {fresh && g.known && g.flow !== 0 && <circle className="cc-node-pulse" cx={lx} cy={ly} r="10" fill="none" stroke="#46ffe1" strokeWidth="1" aria-hidden="true"/>}
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
        {mode === "connections" && regions.filter(r=>[1,3,5,7,10,11].includes(r.regionid)).map(r=>{
          const c=centres[r.regionid];if(!c)return null;
          const x=(c[0]+12)*40,y=(61-c[1])*63;
          const left=[1,3,7,11].includes(r.regionid);const bx=left?x-155:x+28;const by=y-29;
          return <g className="cc-region-card" key={r.regionid} pointerEvents="none"><line x1={x} y1={y} x2={left?bx+135:bx} y2={by+20}/><circle cx={x} cy={y} r="8" fill="#13edca" opacity=".2"/><circle cx={x} cy={y} r="2.5" fill="#72ffe0"/><rect x={bx} y={by} width="135" height="43" rx="4"/><text x={bx+8} y={by+13}>{r.shortname}</text><text className="cc-region-reading" x={bx+8} y={by+29}>{r.intensity.forecast}<tspan fontSize="8" fontWeight="400"> gCO₂/kWh forecast</tspan></text></g>
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
        {mode === "generation" && <GenerationMapLayer filter={assetFilter} search={assetSearch} pilotOnly={pilotOnly} selected={selected} onSelect={setSelected} snapshot={assetSnapshot}/>}
      </svg>
      <div className="atlas-map-note">
        <span className="atlas-dot" />{" "}
        {mode === "generation" ? `Elexon metered snapshot · ${assetSnapshot.points.length ? assetTime(assetSnapshot.points.at(-1)!.from)+" UK" : "Output unavailable"} · approximate sites` : mode === "cables" ? "Elexon · mint imports / violet exports · approximate terminals & schematic paths" : mode === "connections"
          ? "Country aggregates · schematic flows · labels: carbon forecasts"
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
        <a href={mode === "generation" ? "https://www.gov.uk/government/statistics/electricity-chapter-5-digest-of-united-kingdom-energy-statistics-dukes" : "/carbon-intensity/"}>
          {mode === "generation" ? "Asset register" : "Check a postcode"} <ArrowUpRight size={13} />
        </a>
      </div>
      {mode === "generation" && <p className="asset-results" role="status">{matchingAssets(assetFilter,assetSearch,pilotOnly).length} sites shown · May 2026 installed-capacity register · numbered markers group nearby sites{matchingAssets(assetFilter,assetSearch,pilotOnly).length===0 ? ". No matching sites; try another search or fuel." : ""}</p>}
      <div
        className="atlas-access-list"
        data-layer={mode}
        aria-label={
          mode === "generation" ? "Select a generation asset" : mode === "cables" ? "Select a cable" : mode === "connections" ? "Select a connection" : "Select a region"
        }
      >
        {mode === "generation" ? matchingAssets(assetFilter,assetSearch,pilotOnly).map(a=><button key={a.id} aria-pressed={selected===a.id} onClick={()=>setSelected(a.id)}><span>{a.name}</span><strong>{a.installedCapacityMW.toLocaleString("en-GB")} MW · {a.type}</strong></button>) : mode === "cables" ? cables.map(c=>{const r=cableReadings(cableFeed.rows,c.code,now);return <button key={c.id} aria-label={c.name} onClick={()=>setSelected(c.id)} aria-pressed={selected===c.id}><span>{c.name}</span><strong>{r.mw===null?"Unavailable":`${Math.abs(r.mw)} MW ${r.mw>0?"in":r.mw<0?"out":"zero"}`}</strong></button>}) : mode === "connections"
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
          {!cable && mode !== "generation" && <h3>{selected}</h3>}
          {mode === "generation" ? <AssetEvidence id={selected} snapshot={assetSnapshot} error={assetError} onSelect={setSelected}/> : cable ? <CableEvidence cable={cable} rows={cableFeed.rows} now={now} error={cableFeed.error}/> : detail ? (
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
        electricity market. Contains BMRS data © Elexon Limited copyright and database right 2026. <a href="https://www.elexon.co.uk/bsc/data/balancing-mechanism-reporting-agent/copyright-licence-bmrs-data/">BMRS licence</a>. {mode === "generation" && <>Asset records: DESNZ, <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.</>}
      </p>
    </section>
  );
}
