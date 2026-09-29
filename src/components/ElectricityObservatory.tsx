import {HomepageContext} from './HomepageContext';
import {useGridEvidence} from '@/hooks/useGridEvidence';
import {halfHours} from '@/lib/evidence/calculations.mjs';
import {GridEvidenceBriefing} from "./GridEvidenceBriefing";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home, Map, BarChart3, Lightbulb,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { useEnergyData } from "@/contexts/EnergyDataContext";
import { useHistoricalGeneration } from "@/hooks/useHistoricalGeneration";
import { useCarbonOutlook } from "@/hooks/useCarbonOutlook";

import { CommandNavigation, GridCommandCentre } from "./GridCommandCentre";
import "@/styles/command-centre.css";
import "@/styles/immersive-map.css";
const HistoricalGenerationChart = lazy(() =>
  import("./HistoricalGenerationChart").then((m) => ({
    default: m.HistoricalGenerationChart,
  })),
);
import { StaticGridSnapshot } from "./StaticGridSnapshot";
import {
  finite,
  sourceState,
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
export function ElectricityObservatory() {
  const { data, error, loading, refetch } = useEnergyData();
  const history = useHistoricalGeneration();
  const carbon = useCarbonOutlook();
  const [now, setNow] = useState(Date.now());
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const evidence = useGridEvidence();
  const current = halfHours(evidence.data?.sources.FUELHH?.records||[], evidence.data?.sources.INDO?.records||[], now).at(-1);
  const freshness = data?.dataFreshness?.sourceFreshness;
  return (
    <div className="observatory" data-motion={motion ? "on" : "off"}>
      <CommandNavigation now={now} refresh={refetch} loading={loading} motion={motion} toggleMotion={()=>setMotion(v=>!v)}/>

      <main className="atlas-shell">
        {error && <p className="atlas-notice" role="status">Live refresh unavailable. Last known values retain their source timestamps.</p>}
        <GridCommandCentre data={data} history={history} carbon={carbon} now={now}/>
        <GridEvidenceBriefing/>
        <HomepageContext data={data} current={current} carbon={carbon} now={now}/>
        <section id="rhythm" className="atlas-rhythm">
          <Link to="/explore" className="atlas-text-link atlas-chart-link">All charts & controls <ArrowUpRight size={14}/></Link>
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
