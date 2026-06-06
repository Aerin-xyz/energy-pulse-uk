import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';

const latestReport = generated.reports[0];
type ReportCallout = { title: string; body: string };
type ReportHighlight = { label: string; value: string };
type GeneratedReport = typeof latestReport & {
  drivers?: string[];
  cleanestPeriods?: ReportCallout[];
  higherCarbonPeriods?: ReportCallout[];
  highlights?: ReportHighlight[];
  methodologyNote?: string;
};

export const ReportsIndex = () => (
  <>
    <Helmet>
      <title>UK Electricity Mix Reports: Daily and Weekly Grid Summaries</title>
      <meta name="description" content="Read daily and weekly summaries of Britain’s electricity mix, renewable share, gas generation, demand and carbon intensity." />
      <link rel="canonical" href="https://energymix.info/reports/" />
      <meta property="og:title" content="UK Electricity Mix Reports" />
      <meta property="og:description" content="Read daily and weekly summaries of Britain’s electricity mix, renewable share, gas generation, demand and carbon intensity." />
      <meta property="og:url" content="https://energymix.info/reports/" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
    </Helmet>

    <StaticPageLayout eyebrow="Reports" title="UK Electricity Mix Reports" intro="A growing archive of plain-English reports on Britain’s electricity mix, carbon intensity, renewables, gas, demand and practical clean-electricity windows.">
      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Latest weekly report</h2>
        <p className="text-foreground/75 mb-4">
          Start with the latest weekly grid summary, then subscribe if you want the same plain-English brief when new reports are published.
        </p>
        <Link to={latestReport.slug} className="block rounded-lg border border-primary/20 p-5 text-cosmic-cyan hover:bg-primary/10 transition-colors">
          <p className="text-sm uppercase tracking-[0.18em] text-primary/70 mb-2">Featured report</p>
          <h3 className="text-xl font-semibold">{latestReport.title}</h3>
          <p className="mt-2 text-foreground/75">{latestReport.summary}</p>
        </Link>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/newsletter" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Get future weekly reports</Link>
          <Link to="/data" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Check the data sources</Link>
        </div>
      </section>

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

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">How the report engine works</h2>
        <p>
          Weekly reports are generated from validated public generation data, then shaped into a readable summary with source notes and links back to the live dashboard. The aim is to build an indexable record of what happened on Britain’s electricity grid without inventing precision the data does not support.
        </p>
      </section>
    </StaticPageLayout>
  </>
);

export const WeeklyReportPage = () => {
  const { date } = useParams();
  const report = (generated.reports.find((item) => item.slug.endsWith(String(date))) || latestReport) as GeneratedReport;
  const drivers = report.drivers || [];
  const cleanestPeriods = report.cleanestPeriods || [];
  const higherCarbonPeriods = report.higherCarbonPeriods || [];
  const highlights = report.highlights || [];

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
          <h2 className="text-2xl font-semibold text-primary mb-3">The week in key numbers</h2>
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

        {drivers.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">What drove the electricity mix this week?</h2>
            <ul className="space-y-2 list-disc pl-5">
              {drivers.map((driver) => <li key={driver}>{driver}</li>)}
            </ul>
          </section>
        )}

        {cleanestPeriods.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Cleanest periods</h2>
            <div className="space-y-4">
              {cleanestPeriods.map((item) => (
                <div key={item.title} className="rounded-lg border border-primary/20 bg-background/40 p-4">
                  <h3 className="font-semibold text-cosmic-cyan">{item.title}</h3>
                  <p className="mt-2 text-foreground/75">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {higherCarbonPeriods.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Highest-carbon periods</h2>
            <div className="space-y-4">
              {higherCarbonPeriods.map((item) => (
                <div key={item.title} className="rounded-lg border border-primary/20 bg-background/40 p-4">
                  <h3 className="font-semibold text-cosmic-cyan">{item.title}</h3>
                  <p className="mt-2 text-foreground/75">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {highlights.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Wind, solar and gas highlights</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-lg border border-primary/20 p-4">
                  <h3 className="font-semibold text-cosmic-cyan">{item.label}</h3>
                  <p className="mt-2 text-foreground/75">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
          <h2 className="text-2xl font-semibold text-primary mb-3">Get this as a weekly brief</h2>
          <p>The newsletter turns these reports into a short weekly summary of renewables, gas, carbon intensity, records and cleaner electricity windows.</p>
          <Link to="/newsletter" className="mt-4 inline-flex rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Subscribe to the weekly UK electricity mix brief</Link>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Data notes</h2>
          <p>{report.methodologyNote || 'This report was generated from the site’s available 7-day historical generation feed. Carbon-intensity highs/lows and interconnector summaries should be added once reliable historical carbon and flow aggregates are available.'}</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/newsletter" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Get the weekly briefing</Link>
            <Link to="/uk-electricity-mix" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">UK electricity mix explained</Link>
            <Link to="/carbon-intensity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">UK carbon intensity</Link>
            <Link to="/data" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Data sources and methodology</Link>
            <Link to="/yesterday" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Yesterday’s summary</Link>
            <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</Link>
          </div>
        </section>
      </StaticPageLayout>
    </>
  );
};
