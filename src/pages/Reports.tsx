import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';

const latestReport = generated.reports[0];

export const ReportsIndex = () => (
  <>
    <Helmet>
      <title>UK Electricity Mix Reports | Weekly Grid Data Briefings</title>
      <meta name="description" content="Weekly and daily UK electricity mix reports from EnergyMix.info: renewables, gas, wind, solar, demand, carbon intensity and clean electricity windows." />
      <link rel="canonical" href="https://energymix.info/reports/" />
      <meta property="og:title" content="Energy Mix Reports" />
      <meta property="og:description" content="Weekly UK electricity mix briefings and grid intelligence from EnergyMix.info." />
      <meta property="og:url" content="https://energymix.info/reports/" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
    </Helmet>

    <StaticPageLayout eyebrow="Reports" title="UK Electricity Mix Reports" intro="A growing archive of plain-English reports on Britain’s electricity mix, carbon intensity, renewables, gas, demand and practical clean-electricity windows.">
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Latest reports</h2>
        <p className="mb-4 text-foreground/75">
          These reports are generated from the available historical generation feed, then linked back to the live dashboard and source notes so the public numbers can be checked rather than treated as a black box.
        </p>
        <div className="grid gap-4">
          {generated.reports.map((report) => (
            <Link key={report.slug} to={report.slug} className="block rounded-lg border border-primary/20 bg-background/40 p-5 hover:bg-primary/10 transition-colors">
              <p className="text-sm uppercase tracking-[0.18em] text-primary/70 mb-2">Weekly report</p>
              <h3 className="text-xl font-semibold text-cosmic-cyan">{report.title}</h3>
              <p className="mt-2 text-foreground/75">{report.summary}</p>
            </Link>
          ))}
          <Link to="/yesterday" className="block rounded-lg border border-primary/20 bg-background/40 p-5 hover:bg-primary/10 transition-colors">
            <p className="text-sm uppercase tracking-[0.18em] text-primary/70 mb-2">Daily settled summary</p>
            <h3 className="text-xl font-semibold text-cosmic-cyan">{generated.yesterday.title}</h3>
            <p className="mt-2 text-foreground/75">{generated.yesterday.summary}</p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">What reports track</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Average and peak carbon intensity as the reporting feed expands.</li>
          <li>Highest renewable share and strongest wind/solar periods.</li>
          <li>Gas generation highs and demand peaks.</li>
          <li>Cleanest and highest-carbon electricity windows.</li>
          <li>Practical takeaways for EV charging, appliances, batteries and business load shifting.</li>
        </ul>
      </section>
    </StaticPageLayout>
  </>
);

export const WeeklyReportPage = () => {
  const { date } = useParams();
  const report = generated.reports.find((item) => item.slug.endsWith(String(date))) || latestReport;

  return (
    <>
      <Helmet>
        <title>{report.title} | EnergyMix.info</title>
        <meta name="description" content="Weekly EnergyMix.info report for Britain’s electricity mix, renewable share, gas generation, carbon intensity and practical clean-electricity takeaways." />
        <link rel="canonical" href={`https://energymix.info${report.slug}/`} />
        <meta property="og:title" content={report.title} />
        <meta property="og:description" content="A weekly grid intelligence report for Britain’s electricity mix." />
        <meta property="og:url" content={`https://energymix.info${report.slug}/`} />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: report.title,
            datePublished: report.date,
            dateModified: report.date,
            author: { '@type': 'Organization', name: 'EnergyMix.info' },
            publisher: { '@type': 'Organization', name: 'EnergyMix.info', url: 'https://energymix.info/' },
            mainEntityOfPage: `https://energymix.info${report.slug}/`,
            description: 'Weekly report for Britain’s electricity mix, renewables, gas, demand and carbon intensity.',
          })}
        </script>
      </Helmet>

      <StaticPageLayout eyebrow="Weekly grid brief" title={report.title} intro={`${report.intro} Values are calculated from settlement-period generation aggregates and should be read as public grid intelligence, not billing-grade metering.`}>
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
          <p>{report.summary}</p>
          <p className="mt-3">{report.takeaway}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">The week in five numbers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-primary/20">
                {report.metrics.map(([label, value]) => (
                  <tr key={label}><th className="py-3 pr-4">{label}</th><td className="py-3 text-foreground/70">{value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Data notes</h2>
          <p>This report was generated from the site’s available 7-day historical generation feed. Carbon-intensity highs/lows and interconnector summaries should be added once reliable historical carbon and flow aggregates are available.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/newsletter" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Get the weekly briefing</Link>
            <Link to="/records" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Records hub</Link>
            <Link to="/yesterday" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Yesterday’s summary</Link>
            <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};
