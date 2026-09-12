import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  RefreshCw,
  Wind,
  Sun,
  Radio,
  Flame,
  Droplets,
  Leaf,
  Zap,
} from "lucide-react";
import { useEnergyData } from "@/contexts/EnergyDataContext";
import { useHistoricalGeneration } from "@/hooks/useHistoricalGeneration";
import { useCarbonOutlook } from "@/hooks/useCarbonOutlook";
import { GridAtlas } from "./GridAtlas";
import { AtlasNavigation } from "./AtlasNavigation";
const HistoricalGenerationChart = lazy(() =>
  import("./HistoricalGenerationChart").then((m) => ({
    default: m.HistoricalGenerationChart,
  })),
);
import { StaticGridSnapshot } from "./StaticGridSnapshot";
import {
  cleanWindow,
  finite,
  fuelValue,
  RENEWABLE_FUELS,
  sourceState,
  supplyBalance,
  transfers,
} from "@/lib/gridMetrics.mjs";
import generated from "@/data/energyMixGenerated.json";
const gw = (n: number | null | undefined) =>
  finite(n) ? `${(n! / 1000).toFixed(1)}` : "—";
const time = (v: string | Date) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(v));
const colors: Record<string, string> = {
  Wind: "#78dcb8",
  Solar: "#f3c46d",
  Nuclear: "#b8a2e3",
  Gas: "#f09080",
  Hydro: "#79b8de",
  Biomass: "#a6bf7a",
  Other: "#799099",
  Coal: "#aaa5a0",
};
const icons: Record<string, typeof Wind> = {
  Wind,
  Solar: Sun,
  Nuclear: Radio,
  Gas: Flame,
  Hydro: Droplets,
  Biomass: Leaf,
};
export function ElectricityObservatory() {
  const { data, error, loading, refetch } = useEnergyData();
  const history = useHistoricalGeneration();
  const carbon = useCarbonOutlook();
  const [now, setNow] = useState(Date.now());
  const [duration, setDuration] = useState(120);
  const [units, setUnits] = useState<"GW" | "%">("GW");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const mix = (data?.generationMix || [])
    .filter((x) => !["Imports", "PSH", "Pumped Storage"].includes(x.name))
    .sort((a, b) => b.value - a.value);
  const total = data?.totalGenerationMW;
  const top = mix.find(item => finite(item.value) && item.value > 0);
  const renewable = total
    ? (fuelValue(mix, RENEWABLE_FUELS) / total) * 100
    : null;
  const flow = transfers(data?.interconnectors);
  const demand = supplyBalance(
    total,
    data?.interconnectors,
    data?.storage?.netMW,
  );
  const freshness = data?.dataFreshness?.sourceFreshness;
  const generationState = sourceState(freshness?.generation?.timestamp, 5, now);
  const best = useMemo(
    () => cleanWindow(carbon.periods, duration, now),
    [carbon.periods, duration, now],
  );
  const upcoming = carbon.periods.filter(
    (p) => Date.parse(p.from) >= now && finite(p.intensity.forecast),
  );
  const forecastMax = Math.max(1, ...upcoming.map((p) => p.intensity.forecast));
  const changes = useMemo(() => {
    const rows = [...history.data]
      .filter((r) => new Date(r.timestamp).getTime() + 30 * 60000 <= now)
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
    const end = rows.at(-1),
      start = rows.at(-2);
    if (
      !end ||
      !start ||
      +new Date(end.timestamp) - +new Date(start.timestamp) !== 1800000
    )
      return null;
    const items = ["Wind", "Gas", "Nuclear"]
      .map((name) => {
        const a = start.fuelMix.find((x) => x.fuelType === name),
          b = end.fuelMix.find((x) => x.fuelType === name);
        return a && b && finite(a.mw) && finite(b.mw) ? { name, delta: b.mw - a.mw } : null;
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b!.delta) - Math.abs(a!.delta));
    return { items, start: start.timestamp, end: end.timestamp };
  }, [history.data, now]);
  return (
    <div className="observatory">
      <AtlasNavigation />
      <main className="atlas-shell">
        <section className="atlas-intro">
          <div>
            <p className="atlas-eyebrow">
              <span className="atlas-dot" /> GREAT BRITAIN / ELECTRICITY
              INTELLIGENCE
            </p>
            <h1>
              Britain’s electricity.
              <br />
              <span>Live, explained.</span>
            </h1>
            <p className="atlas-deck">
              A living picture of what powers us. Follow the flows.
              <br className="atlas-desktop-break" /> Understand the changes.
              Look a little further ahead.
            </p>
          </div>
          <div className="atlas-clock">
            <span>
              {new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Europe/London",
              }).format(now)}
            </span>
            <strong>
              {time(new Date(now))}
              <small> UK</small>
            </strong>
            <button onClick={() => refetch()} disabled={loading}>
              <RefreshCw size={13} />
              {loading ? "Refreshing…" : "Refresh sources"}
            </button>
          </div>
        </section>
        {error && (
          <p className="atlas-notice" role="status">
            Live refresh unavailable.{" "}
            {data
              ? "Last known values retain their source timestamps."
              : "No current values are being inferred."}
          </p>
        )}
        <div className="atlas-hero">
          <GridAtlas
            flows={data?.interconnectors || []}
            regions={carbon.regions}
            regionFrom={carbon.from}
            regionTo={carbon.to}
            flowTime={freshness?.interconnectors?.timestamp || undefined}
            now={now}
          />
          <aside className="atlas-now">
            <p className="atlas-eyebrow">
              01 / NOW{" "}
              <span
                className={
                  generationState.fresh
                    ? "atlas-status"
                    : "atlas-status delayed"
                }
              >
                {generationState.label}
              </span>
            </p>
            <h2>
              {top
                ? `${top.name} is ${top.name === "Wind" ? "setting the pace." : "leading the mix."}`
                : "The grid, in focus."}
            </h2>
            <p>
              {top
                ? `${gw(top.value)} GW of ${top.name.toLowerCase()} in the latest generation reading. ${finite(flow.net) ? `Britain is ${flow.net > 0 ? "a net importer" : flow.net < 0 ? "a net exporter" : "balanced across its connections"}.` : "Transfer data is incomplete."}`
                : "Connecting to public electricity sources. Missing readings stay missing."}
            </p>
            <div className="atlas-key-number">
              <span>DOMESTIC GENERATION</span>
              <div>
                {gw(total)}
                <small> GW</small>
              </div>
              <div className="atlas-mini-composition">
                {mix.map((m) => (
                  <span
                    key={m.name}
                    style={{
                      width: `${total ? (m.value / total) * 100 : 0}%`,
                      background: colors[m.name] || "#789099",
                    }}
                    title={`${m.name}: ${gw(m.value)} GW`}
                  />
                ))}
              </div>
              <small>Excludes imports and pumped storage</small>
            </div>
            <dl className="atlas-now-metrics">
              <div>
                <dt>Renewable share</dt>
                <dd>
                  {finite(renewable) ? renewable.toFixed(1) : "—"}
                  <small>%</small>
                </dd>
              </div>
              <div>
                <dt>
                  Carbon intensity{" "}
                  <small>
                    {sourceState(freshness?.carbon?.timestamp, 30, now).label}
                  </small>
                </dt>
                <dd>
                  {data?.carbonIntensity?.actual ?? "—"}
                  <small> gCO₂/kWh</small>
                </dd>
              </div>
              <div>
                <dt>
                  Estimated demand <small>Supply-balance definition</small>
                </dt>
                <dd>
                  {gw(demand)}
                  <small> GW</small>
                </dd>
              </div>
            </dl>
            <Link to="/methodology" className="atlas-text-link">
              Understand these numbers <ArrowUpRight size={14} />
            </Link>
            <div className="atlas-now-foot">
              <Clock3 size={13} />
              <span>
                Source intervals differ. “Live” means latest available, not
                instantaneous.
              </span>
            </div>
          </aside>
        </div>
        <section
          className="atlas-generation"
          aria-labelledby="generation-heading"
        >
          <div className="atlas-section-head">
            <div>
              <p className="atlas-eyebrow">THE MIX</p>
              <h2 id="generation-heading">Many sources. One system.</h2>
            </div>
            <div className="atlas-tabs">
              {(["GW", "%"] as const).map((u) => (
                <button
                  key={u}
                  aria-pressed={units === u}
                  onClick={() => setUnits(u)}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="atlas-fuel-grid">
            {mix.length ? (
              mix.map((m) => {
                const Icon = icons[m.name] || Zap;
                return (
                  <Link
                    key={m.name}
                    to={
                      m.name === "Wind"
                        ? "/uk-wind-power-today"
                        : m.name === "Solar"
                          ? "/uk-solar-power-today"
                          : m.name === "Gas"
                            ? "/gas-generation"
                            : m.name === "Nuclear"
                              ? "/nuclear-power"
                              : "/explore"
                    }
                    className="atlas-fuel"
                    style={
                      {
                        "--fuel": colors[m.name] || "#789099",
                      } as React.CSSProperties
                    }
                  >
                    <span>
                      <Icon size={17} />
                      {m.name}
                      <ArrowUpRight size={12} />
                    </span>
                    <strong>
                      {units === "GW"
                        ? gw(m.value)
                        : total
                          ? ((m.value / total) * 100).toFixed(1)
                          : "—"}
                      <small>{units}</small>
                    </strong>
                    <div className="atlas-fuel-track">
                      <i
                        style={{
                          width: `${total ? (m.value / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="atlas-empty">Awaiting generation readings…</p>
            )}
          </div>
          <p className="atlas-caption">
            Share of domestic generation · renewables include wind, solar, hydro
            and biomass; pumped storage is separate.
          </p>
        </section>
        <section className="atlas-editorial">
          <article>
            <p className="atlas-eyebrow">02 / WHAT CHANGED</p>
            <h2>The latest shift.</h2>
            {changes ? (
              <>
                <p className="atlas-caption">
                  Completed half-hours starting {time(changes.start)} →{" "}
                  {time(changes.end)} UK. Historical feed; not a comparison with
                  embedded-enriched live values.
                </p>
                <ul className="atlas-changes">
                  {changes.items.slice(0, 3).map((c) => (
                    <li key={c!.name}>
                      <span>
                        {c!.name === "Wind" ? "Measured wind" : c!.name}
                      </span>
                      <strong>
                        {Math.abs(c!.delta) < 50
                          ? "No material change"
                          : `${c!.delta >= 0 ? "+" : "−"}${gw(Math.abs(c!.delta))} GW`}
                      </strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                Comparable completed periods are not available yet. We won’t
                turn a missing reading into a trend.
              </p>
            )}
            <a className="atlas-text-link" href="#rhythm">
              Explore the timeline <ArrowDown size={14} />
            </a>
          </article>
          <article>
            <p className="atlas-eyebrow">03 / WHY IT MATTERS</p>
            <h2>
              {(data?.marketIndexPrice?.priceGBPPerMWh ?? 1) < 0
                ? "Below zero. Not a free bill."
                : top?.name === "Wind"
                  ? "The weather does real work."
                  : "The mix tells a bigger story."}
            </h2>
            <p>
              {(data?.marketIndexPrice?.priceGBPPerMWh ?? 1) < 0
                ? "The latest wholesale market index is negative. That is a market signal—not a promise of free electricity at home. Your tariff determines what you pay."
                : top?.name === "Wind"
                  ? "Wind is the largest source in the latest reading. More wind can reduce the need for fossil generation, but demand, exports and other sources also shape the outcome."
                  : "Generation, demand, imports and storage work together. A single number cannot tell you whether the whole system is healthy or why a change happened."}
            </p>
            <Link className="atlas-text-link" to="/uk-electricity-mix">
              Read the explanation <ArrowUpRight size={14} />
            </Link>
          </article>
          <article className="atlas-outlook">
            <p className="atlas-eyebrow">04 / WHAT HAPPENS NEXT</p>
            <h2>A cleaner window.</h2>
            <label className="atlas-duration">
              Find a{" "}
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={60}>1 hour</option>
                <option value={120}>2 hour</option>
                <option value={180}>3 hour</option>
              </select>{" "}
              window
            </label>
            {best ? (
              <>
                <strong className="atlas-window">
                  {time(best.from)} — {time(best.to)}
                </strong>
                <p>
                  Lowest average forecast in the returned horizon:{" "}
                  <b>{Math.round(best.intensity)} gCO₂/kWh</b>.
                </p>
                <div
                  className="atlas-forecast-bars"
                  role="img"
                  aria-label="Upcoming carbon intensity forecast; taller bars mean higher carbon"
                >
                  {upcoming.map((p) => (
                    <i
                      key={p.from}
                      className={
                        Date.parse(p.from) >= Date.parse(best.from) &&
                        Date.parse(p.to) <= Date.parse(best.to)
                          ? "chosen"
                          : ""
                      }
                      style={{
                        height: `${Math.max(8, (p.intensity.forecast / forecastMax) * 100)}%`,
                      }}
                      title={`${time(p.from)}: ${p.intensity.forecast} gCO₂/kWh`}
                    />
                  ))}
                </div>
                <small>
                  UK time ·{" "}
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "Europe/London",
                  }).format(new Date(best.from))}{" "}
                  · forecast, not a guarantee. Lower carbon does not necessarily
                  mean a lower bill.
                </small>
                <details>
                  <summary>Forecast evidence</summary>
                  <p>
                    Carbon Intensity API · retrieved {time(carbon.retrievedAt)}{" "}
                    UK. Upstream issue time not supplied.
                  </p>
                  <table>
                    <caption>Upcoming half-hour forecasts, gCO₂/kWh</caption>
                    <tbody>
                      {upcoming.map((p) => (
                        <tr key={p.from}>
                          <th>{time(p.from)}</th>
                          <td>{p.intensity.forecast}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </>
            ) : (
              <p>
                No complete future window is available. Forecast guidance will
                return when there is sufficient coverage.
              </p>
            )}
          </article>
        </section>
        <section className="atlas-signals">
          <Link to="/wholesale-electricity-price">
            <span>
              WHOLESALE INDEX <ArrowUpRight size={13} />
            </span>
            <strong>
              {data?.marketIndexPrice
                ? `£${data.marketIndexPrice.priceGBPPerMWh.toFixed(2)}`
                : "—"}
              <small> /MWh</small>
            </strong>
            <small>
              {sourceState(data?.marketIndexPrice?.startTime, 30, now).label} ·
              not your retail tariff
            </small>
          </Link>
          <Link to="/pumped-storage">
            <span>
              PUMPED STORAGE <ArrowUpRight size={13} />
            </span>
            <strong>
              {gw(data?.storage?.absMW)}
              <small> GW · {data?.storage?.mode || "unavailable"}</small>
            </strong>
            <small>
              {sourceState(data?.storage?.timestamp, 5, now).label} · not
              battery state of charge
            </small>
          </Link>
          <Link to="/interconnectors">
            <span>
              NET TRANSFERS <ArrowUpRight size={13} />
            </span>
            <strong>
              {gw(finite(flow.net) ? Math.abs(flow.net) : null)}
              <small>
                {" "}
                GW ·{" "}
                {finite(flow.net)
                  ? flow.net > 0
                    ? "importing"
                    : flow.net < 0
                      ? "exporting"
                      : "balanced"
                  : "unknown"}
              </small>
            </strong>
            <small>
              {
                sourceState(freshness?.interconnectors?.timestamp, 30, now)
                  .label
              }{" "}
              · imports minus exports
            </small>
          </Link>
        </section>
        <section id="rhythm" className="atlas-rhythm">
          <div className="atlas-section-head">
            <div>
              <p className="atlas-eyebrow">FOLLOW THE DAY</p>
              <h2>Britain’s electrical rhythm.</h2>
            </div>
            <Link to="/explore" className="atlas-text-link">
              All charts & controls <ArrowUpRight size={14} />
            </Link>
          </div>
          {history.error ? (
            <p className="atlas-notice">
              Historical readings are unavailable. Try again later.
            </p>
          ) : history.data.length ? (
            <Suspense fallback={<p>Loading chart…</p>}>
              <HistoricalGenerationChart
                data={history.data}
                lastUpdated={history.lastUpdated}
                meta={history.meta}
                weeklyData={history.weeklyData}
                weeklyLoading={history.weeklyLoading}
                weeklyError={history.weeklyError}
                weeklyLastUpdated={history.weeklyLastUpdated}
                weeklyMeta={history.weeklyMeta}
                onFetchWeeklyData={history.fetchWeeklyData}
              />
            </Suspense>
          ) : (
            <p className="atlas-empty">
              Loading the historical generation timeline…
            </p>
          )}
          <p className="atlas-caption">
            Historical measured generation has different embedded-source
            coverage from the live mix. Gaps and incomplete periods are not
            observations.
          </p>
        </section>
        <section className="atlas-reading">
          <div>
            <p className="atlas-eyebrow">BEYOND THE MOMENT</p>
            <h2>
              Stay curious.
              <br />
              Follow the evidence.
            </h2>
            <Link to="/reports" className="atlas-text-link">
              All briefings <ArrowRight size={14} />
            </Link>
          </div>
          <Link className="atlas-story" to={generated.reports[0].slug}>
            <span>THE GRID BRIEF / {generated.reports[0].date}</span>
            <h3>
              Seven days.
              <br />A different perspective.
            </h3>
            <p>
              Generation, changing renewables and gas, with the limits of the
              evidence in view.
            </p>
            <ArrowUpRight size={20} />
          </Link>
          <Link className="atlas-story" to="/cleanest-time-to-use-electricity">
            <span>THE EXPLAINER / CLEANER ELECTRICITY</span>
            <h3>
              When is electricity
              <br />
              actually cleaner?
            </h3>
            <p>
              Why the answer changes with the weather—and why clean and cheap
              are not the same thing.
            </p>
            <ArrowUpRight size={20} />
          </Link>
        </section>
        <section className="atlas-evidence">
          <details>
            <summary>Every number has a source. Inspect this snapshot.</summary>
            <p>
              Scope: Great Britain, excluding Northern Ireland. Demand is an
              estimated supply balance, not metered national consumption.
              Biomass is included in renewable share; storage is excluded.
              Individual inputs can cover different intervals.
            </p>
            <dl>
              {Object.entries(freshness || {}).map(([key, s]) => (
                <div key={key}>
                  <dt>{s.label || key}</dt>
                  <dd>
                    {s.source} · {s.timestamp || "Source timestamp unavailable"}{" "}
                    ·{" "}
                    {
                      sourceState(s.timestamp, s.cadenceMinutes || 30, now)
                        .label
                    }
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              <Link to="/methodology">Definitions and limitations</Link> ·{" "}
              <Link to="/data">Source directory</Link> ·{" "}
              <Link to="/citation">How to cite</Link>
            </p>
          </details>
        </section>
        {!data && <StaticGridSnapshot />}
        <section className="atlas-newsletter">
          <div>
            <p className="atlas-eyebrow">THE WEEKLY CURRENT</p>
            <h2>
              A little grid intelligence.
              <br />A lot less noise.
            </h2>
          </div>
          <Link to="/newsletter">
            Get the weekly briefing <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="atlas-footer">
        <span>
          energy mix <small>Britain’s electricity — live, explained.</small>
        </span>
        <nav>
          <Link to="/about">About</Link>
          <Link to="/data">Sources</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/contact">Corrections</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
        <small>
          Contains BMRS data © Elexon Limited {new Date().getFullYear()}.
          Sources retain their respective terms.
        </small>
      </footer>
    </div>
  );
}
