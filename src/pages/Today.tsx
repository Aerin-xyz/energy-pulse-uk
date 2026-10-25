import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { LiveSeoModule } from '@/components/LiveSeoModule';
import generated from '@/data/energyMixGenerated.json';
import { absoluteDailySummary } from '@/lib/initialEvidence.mjs';

const Today = () => {
  return (
    <>
      <Helmet>
        <title>UK Electricity Mix Today | Live Generation and Carbon Intensity</title>
        <meta name="description" content="Today’s live GB electricity mix, renewable share, gas, demand and carbon intensity, explained in plain English." />
        <link rel="canonical" href="https://energymix.info/today/" />
        <meta property="og:title" content="UK Electricity Mix Today" />
        <meta property="og:description" content="Today’s live GB electricity mix, renewable share, gas, demand and carbon intensity, explained in plain English." />
        <meta property="og:url" content="https://energymix.info/today/" />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Today"
        title="UK Electricity Mix Today"
        intro="The latest available Great Britain electricity readings, with separately dated historical context. These are current observations, not a complete average or total for today."
      >
        <LiveSeoModule focus="mix" />

        <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
          <h2 className="text-2xl font-semibold text-primary mb-3">Archived daily context</h2>
          <p>
            {absoluteDailySummary(generated.yesterday)}
          </p>
          <p className="mt-3 text-sm text-foreground/65">
            The archived day is not today or yesterday unless its absolute date matches. Live readings can move before a new settled daily report is available.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">How to read today’s page</h2>
          <p>This page combines live browser-refreshed data with generated daily context. Use the live values for the current grid picture, and use the settled summary for a more stable check against recent historical generation data.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Live dashboard</Link>
            <Link to="/uk-electricity-mix" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">UK electricity mix explained</Link>
            <Link to="/reports" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Reports archive</Link>
            <Link to="/yesterday" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Dated daily summary</Link>
            <Link to="/carbon-intensity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Carbon intensity</Link>
            <Link to="/data" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Electricity data sources</Link>
            <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Today;
