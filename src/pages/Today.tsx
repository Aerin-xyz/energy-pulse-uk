import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { useEnergyData } from '@/contexts/EnergyDataContext';

const formatMw = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value).toLocaleString('en-GB')} MW` : 'Awaiting live data';
const formatPercent = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Awaiting live data';

const Today = () => {
  const { data, loading } = useEnergyData();
  const renewablesMW = data?.generationMix
    ?.filter((item) => ['wind', 'solar', 'hydro', 'pumped storage'].some((needle) => item.name.toLowerCase().includes(needle)))
    .reduce((sum, item) => sum + item.value, 0);
  const gas = data?.generationMix?.find((item) => item.name.toLowerCase().includes('gas'));
  const wind = data?.generationMix?.find((item) => item.name.toLowerCase().includes('wind'));
  const renewableShare = data?.totalGenerationMW && renewablesMW ? (renewablesMW / data.totalGenerationMW) * 100 : undefined;
  const lastUpdated = data?.lastUpdated ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(data.lastUpdated) : null;

  return (
    <>
      <Helmet>
        <title>UK Electricity Mix Today | Live Generation, Demand & Carbon Intensity</title>
        <meta name="description" content="Today’s Great Britain electricity mix: live generation, demand, renewable share, gas output, carbon intensity and source freshness from public grid data." />
        <link rel="canonical" href="https://energymix.info/today/" />
        <meta property="og:title" content="UK Electricity Mix Today" />
        <meta property="og:description" content="Live daily summary of Britain’s electricity mix, demand, renewables and carbon intensity." />
        <meta property="og:url" content="https://energymix.info/today/" />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Today"
        title="UK Electricity Mix Today"
        intro="A live daily landing page for Britain’s electricity mix, showing the latest available demand, generation, renewables, gas and carbon-intensity context."
      >
        <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
          <h2 className="text-2xl font-semibold text-primary mb-3">Current summary</h2>
          {loading && !data ? (
            <p>Loading the latest live grid data…</p>
          ) : (
            <p>
              Great Britain electricity demand is currently <strong>{formatMw(data?.totalDemandMW)}</strong>, with total measured generation at <strong>{formatMw(data?.totalGenerationMW)}</strong>. Renewable sources are providing about <strong>{formatPercent(renewableShare)}</strong> of measured generation, while gas is at <strong>{formatMw(gas?.value)}</strong> and wind is at <strong>{formatMw(wind?.value)}</strong>.
            </p>
          )}
          <p className="mt-3 text-sm text-foreground/65">Latest dashboard refresh: {lastUpdated || 'awaiting live data'}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Today’s key signals</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-primary/20 p-4"><h3 className="font-semibold">Demand</h3><p className="text-foreground/75 mt-1">{formatMw(data?.totalDemandMW)}</p></div>
            <div className="rounded-lg border border-primary/20 p-4"><h3 className="font-semibold">Carbon intensity</h3><p className="text-foreground/75 mt-1">{data?.carbonIntensity?.actual ? `${data.carbonIntensity.actual} gCO₂/kWh` : 'Awaiting live data'}</p></div>
            <div className="rounded-lg border border-primary/20 p-4"><h3 className="font-semibold">Renewable share</h3><p className="text-foreground/75 mt-1">{formatPercent(renewableShare)}</p></div>
            <div className="rounded-lg border border-primary/20 p-4"><h3 className="font-semibold">Gas generation</h3><p className="text-foreground/75 mt-1">{formatMw(gas?.value)}</p></div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">How to read today’s page</h2>
          <p>This page is intentionally useful before it becomes fully automated. The live values provide the current grid picture; future iterations should add highest renewable share today, lowest carbon intensity today, peak demand, gas-share trend, wind/solar highlights and a link to yesterday’s settled summary.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Live dashboard</Link>
            <Link to="/reports" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Reports archive</Link>
            <Link to="/carbon-intensity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Carbon intensity</Link>
            <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Today;
