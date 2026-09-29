import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { NewsletterCta } from '@/components/NewsletterCta';
import generated from '@/data/energyMixGenerated.json';
import archive from '@/data/reportArchive.json';
import NotFound from './NotFound';
const reports = archive as typeof generated.reports;

const latestReport = reports[0];
type ReportCallout = { title: string; body: string };
type ReportHighlight = { label: string; value: string };
type GeneratedReport = typeof latestReport & {
  drivers?: string[];
  cleanestPeriods?: ReportCallout[];
  higherCarbonPeriods?: ReportCallout[];
  highlights?: ReportHighlight[];
  methodologyNote?: string;
  validation?: {status:string;days:number;timeBasis:string;evidencePath:string;dailyCsv:string;checkedAt:string};
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
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="EnergyMix.info" />
      <meta property="og:locale" content="en_GB" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="UK Electricity Mix Reports" />
      <meta name="twitter:description" content="Read daily and weekly summaries of Britain’s electricity mix, renewable share, gas generation, demand and carbon intensity." />
      <meta name="twitter:image" content="https://energymix.info/og-insights.jpg" />
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

      <NewsletterCta
        label="reports_index_feature"
        body="Get the weekly report in your inbox, with the cleanest windows, gas and renewables context, and links back to the source data."
      />

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Latest reports</h2>
        <p className="mb-4 text-foreground/75">
          These reports are generated from the available historical generation feed, then linked back to the live dashboard and source notes so the public numbers can be checked rather than treated as a black box.
        </p>
        <div className="grid gap-4">
          {reports.map((report) => (
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
          Weekly reports compile public generation data into summaries calculated by Energy Mix, with source notes and links back to the live dashboard. Validation coverage varies; a published report is not independent certification of its source data. The aim is to build an indexable record of what happened on Britain’s electricity grid without inventing precision the data does not support.
        </p>
      </section>
    </StaticPageLayout>
  </>
);

export const WeeklyReportPage = () => {
  const { date } = useParams();
  const report = reports.find((item) => item.slug === `/reports/weekly/${date}`) as GeneratedReport;
  if (!report) return <NotFound />;
  const drivers = report.drivers || [];
  const cleanestPeriods = report.cleanestPeriods || [];
  const higherCarbonPeriods = report.higherCarbonPeriods || [];
  const highlights = report.highlights || [];
  const reportUrl = `https://energymix.info${report.slug}/`;
  const reportDescription = `${report.summary} ${report.takeaway}`.slice(0, 280);
  const shareText = `${report.title} - ${report.summary}`;
  const encodedUrl = encodeURIComponent(reportUrl);
  const encodedText = encodeURIComponent(shareText);

  return (
    <>
      <Helmet>
        <title>{report.title} | EnergyMix.info</title>
        <meta name="description" content={reportDescription} />
        <link rel="canonical" href={reportUrl} />
        <meta property="og:title" content={report.title} />
        <meta property="og:description" content={reportDescription} />
        <meta property="og:url" content={reportUrl} />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={report.date} />
        <meta property="article:modified_time" content={report.date} />
        <meta property="og:site_name" content="EnergyMix.info" />
        <meta property="og:locale" content="en_GB" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={report.title} />
        <meta name="twitter:description" content={reportDescription} />
        <meta name="twitter:image" content="https://energymix.info/og-insights.jpg" />
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
            image: 'https://energymix.info/og-insights.jpg',
            mainEntityOfPage: reportUrl,
            description: reportDescription,
          })}
        </script>
      </Helmet>

      <StaticPageLayout eyebrow="Weekly grid brief" title={report.title} intro={`${report.intro} Values are calculated from settlement-period generation aggregates and should be read as public grid intelligence, not billing-grade metering.`}>
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
          <p>{report.summary}</p>
          <p className="mt-3">{report.takeaway}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Share on LinkedIn</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Share on X</a>
          </div>
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
            <h2 className="text-2xl font-semibold text-primary mb-3">{report.validation ? "Renewable and gas comparisons — not carbon rankings" : "Cleanest periods"}</h2>
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
            <h2 className="text-2xl font-semibold text-primary mb-3">{report.validation ? "Higher gas output — not a carbon measurement" : "Highest-carbon periods"}</h2>
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

        <NewsletterCta
          label="weekly_report_body"
          title="Get this as a weekly brief"
          body="The newsletter turns reports like this into a short weekly summary of renewables, gas, carbon intensity, records and cleaner electricity windows."
        />

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Data notes</h2>
          <p><strong>Compiled by Energy Mix from Elexon generation data and NESO embedded-generation estimates.</strong> Energy Mix calculates the totals, averages and comparisons shown here. Source data may be revised. Source attribution does not mean that Elexon or NESO has reviewed or endorsed this report.</p>
          <p className="mt-3">Sources: <a className="text-cosmic-cyan underline" href="https://bmrs.elexon.co.uk/api-documentation/dataset/FUELHH">Elexon Insights FUELHH</a>; <a className="text-cosmic-cyan underline" href="https://api.neso.energy/dataset/historic-generation-mix">NESO Historic GB Generation Mix</a>; <a className="text-cosmic-cyan underline" href="https://api.neso.energy/dataset/demand-data-update">NESO Demand Data Update</a>. These datasets can share underlying observations; agreement is not independent certification.</p>
          <p className="mt-3">Renewable-share and gas-output comparisons are not measurements of carbon intensity. See <Link className="text-cosmic-cyan underline" to="/data">data sources and methodology</Link> for source information. {!report.validation && "A report-specific reproducible evidence pack was not preserved for this publication."}</p>
          {report.validation && <aside className="mt-4 rounded-lg border border-primary/30 p-4" aria-label="Report evidence"><h3 className="font-semibold">All-days checks: {report.validation.status}</h3><p>{report.validation.days} reporting days · {report.validation.timeBasis} day boundaries. Checked {new Date(report.validation.checkedAt).toLocaleString('en-GB',{timeZone:'Europe/London'})} UK.</p><p className="mt-2">Generation, coverage and historical carbon availability are recorded separately. Cross-checks are not independent certification.</p><div className="mt-3 flex flex-wrap gap-4"><a className="text-cosmic-cyan underline" href={report.validation.evidencePath}>Checks and source manifest (JSON)</a><a className="text-cosmic-cyan underline" href={report.validation.dailyCsv}>Daily figures (CSV)</a></div></aside>}
          {date === '2026-09-29' && <aside className="mt-4 rounded-lg border border-primary/30 p-4" aria-label="Report validation clarification"><h3 className="font-semibold">Validation: partial</h3><p>This report covers six available complete days, 23–28 September 2026. External comparisons recorded in the 29 September validation run cover 28 September only, not every day in this report. That run had warnings for the legacy UTC reporting-day basis and incomplete NESO Demand Data Update coverage.</p><p className="mt-2 text-sm">Clarification added 29 September 2026. The archived report’s figures and original reporting period have not been recalculated or changed.</p></aside>}
          <details className="mt-4"><summary>Original publication methodology note</summary><p className="mt-2">{report.methodologyNote || 'No report-specific methodology note was preserved.'}</p><p className="mt-2 text-sm">Preserved as part of the original publication. Any broad validation wording in this note should not be read as proof that all reporting days or narrative claims were checked.</p></details>
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
