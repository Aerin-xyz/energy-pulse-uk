import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { PowerFlowCard } from '@/components/PowerFlowCard';
import { ChartSkeleton } from '@/components/LoadingSkeleton';
import { useEnergyData } from '@/contexts/EnergyDataContext';

const PowerFlow = () => {
  const { data, loading } = useEnergyData();

  return (
    <>
      <Helmet>
        <title>GB Power Flow Live | UK Electricity Generation and Demand Visualisation</title>
        <meta name="description" content="Live GB power flow visualisation showing UK electricity generation sources, demand, imports, exports, low-carbon share and carbon intensity." />
        <link rel="canonical" href="https://energymix.info/power-flow/" />
        <meta property="og:title" content="GB Power Flow Live" />
        <meta property="og:description" content="A live visualisation of Great Britain electricity generation, demand and interconnector flows." />
        <meta property="og:url" content="https://energymix.info/power-flow/" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Live visualisation"
        title="GB Power Flow"
        intro="A simplified live view of how Great Britain’s electricity generation, transfers and demand fit together. Built for quick understanding, not as a physical grid schematic."
      >
        {loading && !data ? (
          <ChartSkeleton />
        ) : data ? (
          <PowerFlowCard
            generationMix={data.generationMix}
            interconnectors={data.interconnectors}
            totalDemandMW={data.totalDemandMW || 0}
            totalGenerationMW={data.totalGenerationMW || 0}
            carbonIntensity={data.carbonIntensity}
            settlementPeriod={data.asOf?.settlementPeriod}
            sourceTimestamp={data.dataFreshness?.sourceFreshness?.generation?.timestamp || data.asOf?.endISO}
          />
        ) : (
          <div className="rounded-lg border border-primary/20 bg-background/40 p-5">Awaiting live grid data…</div>
        )}

        <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
          <h2 className="mb-3 text-2xl font-semibold text-primary">How to read it</h2>
          <p className="text-foreground/80">
            Each animated line represents a major live electricity source or transfer category. Thicker and faster lines mean more power. The centre shows current GB demand, while the surrounding nodes show generation categories and net interconnector flow.
          </p>
          <p className="mt-3 text-sm text-foreground/65">
            Inspired by flixlix’s Power Flow Card Plus for Home Assistant, rebuilt natively for EnergyMix.info using public GB electricity data.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-2xl font-semibold text-primary">Related pages</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Link to="/" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Live dashboard</Link>
            <Link to="/uk-electricity-mix" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">UK electricity mix explainer</Link>
            <Link to="/interconnectors" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Interconnectors</Link>
            <Link to="/carbon-intensity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Carbon intensity</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default PowerFlow;
