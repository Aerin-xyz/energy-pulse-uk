import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';

const Yesterday = () => {
  const yesterday = generated.yesterday;
  return (
    <>
      <Helmet>
        <title>{yesterday.title} | EnergyMix.info</title>
        <meta name="description" content="Yesterday’s Great Britain electricity mix summary: average generation, renewable share, wind, solar and gas output from available historical data." />
        <link rel="canonical" href="https://energymix.info/yesterday/" />
        <meta property="og:title" content={yesterday.title} />
        <meta property="og:description" content={yesterday.summary} />
        <meta property="og:url" content="https://energymix.info/yesterday/" />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout eyebrow="Yesterday" title={yesterday.title} intro="A settled daily summary is more useful for search and citations than a live page because the day is complete and the numbers can be compared consistently.">
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
          <p>{yesterday.summary}</p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Yesterday in five numbers</h2>
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
