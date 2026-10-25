import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';
import { absoluteDailySummary } from '@/lib/initialEvidence.mjs';

const Yesterday = () => {
  const yesterday = generated.yesterday;
  return (
    <>
      <Helmet>
        <title>{`GB Electricity Daily Summary: ${yesterday.date}`} | EnergyMix.info</title>
        <meta name="description" content="Dated Great Britain electricity mix summary: average generation, renewable share, wind, solar and gas output from available historical data." />
        <link rel="canonical" href="https://energymix.info/yesterday/" />
        <meta property="og:title" content={`GB Electricity Daily Summary: ${yesterday.date}`} />
        <meta property="og:description" content={absoluteDailySummary(yesterday)} />
        <meta property="og:url" content="https://energymix.info/yesterday/" />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout eyebrow="Dated daily archive" title={`GB Electricity Daily Summary: ${yesterday.date}`} intro="This is a dated archive of the latest available daily summary. It is not a claim that the archived date is yesterday. See the methodology for coverage and definition limits.">
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
          <p>{absoluteDailySummary(yesterday)}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">The archived day in five numbers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-primary/20">
                {yesterday.metrics.map(([label, value]) => (
                  <tr key={label}><th className="py-3 pr-4">{label}</th><td className="py-3 text-foreground/70">{value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/today" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Today’s live mix</Link>
            <Link to="/reports" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Reports archive</Link>
            <Link to="/records" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Records</Link>
            <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time guide</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Yesterday;
