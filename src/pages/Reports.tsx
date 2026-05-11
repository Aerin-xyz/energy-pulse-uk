import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

export const ReportsIndex = () => (
  <>
    <Helmet>
      <title>Energy Mix Reports | Weekly UK Electricity Mix Briefings</title>
      <meta name="description" content="Weekly and daily EnergyMix.info reports on Britain’s electricity mix, renewables, gas, demand, carbon intensity and clean electricity windows." />
      <link rel="canonical" href="https://energymix.info/reports" />
      <meta property="og:title" content="Energy Mix Reports" />
      <meta property="og:description" content="Weekly UK electricity mix briefings and grid intelligence from EnergyMix.info." />
      <meta property="og:url" content="https://energymix.info/reports" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
    </Helmet>

    <StaticPageLayout
      eyebrow="Reports"
      title="Energy Mix Reports"
      intro="A growing archive of plain-English reports on Britain’s electricity mix, carbon intensity, renewables, gas, demand and practical clean-electricity windows."
    >
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Latest reports</h2>
        <div className="grid gap-4">
          <Link to="/reports/weekly/2026-05-11" className="block rounded-lg border border-primary/20 bg-background/40 p-5 hover:bg-primary/10 transition-colors">
            <p className="text-sm uppercase tracking-[0.18em] text-primary/70 mb-2">Weekly report template</p>
            <h3 className="text-xl font-semibold text-cosmic-cyan">UK Electricity Mix Weekly Report: 11 May 2026</h3>
            <p className="mt-2 text-foreground/75">The first report shell for weekly grid intelligence, ready to be populated with measured weekly data as reporting automation matures.</p>
          </Link>
          <Link to="/today" className="block rounded-lg border border-primary/20 bg-background/40 p-5 hover:bg-primary/10 transition-colors">
            <p className="text-sm uppercase tracking-[0.18em] text-primary/70 mb-2">Daily live summary</p>
            <h3 className="text-xl font-semibold text-cosmic-cyan">UK Electricity Mix Today</h3>
            <p className="mt-2 text-foreground/75">A live daily landing page summarising the latest available grid mix, demand, carbon intensity and source freshness.</p>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">What future reports will track</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Average and peak carbon intensity.</li>
          <li>Highest renewable share and strongest wind/solar periods.</li>
          <li>Gas generation highs and demand peaks.</li>
          <li>Cleanest and highest-carbon electricity windows.</li>
          <li>Practical takeaways for EV charging, appliances, batteries and business load shifting.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Get the weekly briefing</h2>
        <p>Energy Mix reports are designed to become the source material for a short weekly newsletter and LinkedIn update.</p>
        <Link to="/newsletter" className="inline-block mt-4 rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Join the newsletter</Link>
      </section>
    </StaticPageLayout>
  </>
);

export const WeeklyReport20260511 = () => (
  <>
    <Helmet>
      <title>UK Electricity Mix Weekly Report: 11 May 2026 | EnergyMix.info</title>
      <meta name="description" content="Weekly EnergyMix.info report template for Britain’s electricity mix, renewable share, gas generation, carbon intensity and practical clean-electricity takeaways." />
      <link rel="canonical" href="https://energymix.info/reports/weekly/2026-05-11" />
      <meta property="og:title" content="UK Electricity Mix Weekly Report: 11 May 2026" />
      <meta property="og:description" content="A weekly grid intelligence report template for Britain’s electricity mix." />
      <meta property="og:url" content="https://energymix.info/reports/weekly/2026-05-11" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'UK Electricity Mix Weekly Report: 11 May 2026',
          datePublished: '2026-05-11',
          dateModified: '2026-05-11',
          author: { '@type': 'Organization', name: 'EnergyMix.info' },
          publisher: { '@type': 'Organization', name: 'EnergyMix.info', url: 'https://energymix.info/' },
          mainEntityOfPage: 'https://energymix.info/reports/weekly/2026-05-11',
          description: 'Weekly report template for Britain’s electricity mix, renewables, gas, demand and carbon intensity.',
        })}
      </script>
    </Helmet>

    <StaticPageLayout
      eyebrow="Weekly grid brief"
      title="UK Electricity Mix Weekly Report: 11 May 2026"
      intro="A first measured weekly report for EnergyMix.info using the available 7-day historical generation feed for 5-11 May 2026. Values are calculated from settlement-period generation aggregates and should be read as public grid intelligence, not billing-grade metering."
    >
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
        <p>The week from 5-11 May 2026 shifted from gas-heavy weekdays into a cleaner, wind-led weekend. The strongest renewable day in the available data was Sunday 10 May, when wind, solar and hydro together averaged about 53.2% of measured generation across settlement periods. Gas was highest on Thursday 7 May and lowest on Sunday 10 May.</p>
        <p className="mt-3">The practical takeaway: flexible electricity use was most attractive during the windier, lower-gas weekend periods. For EV charging, batteries and flexible appliances, the signal to watch is the combination of high wind, lower gas and lower carbon intensity.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">The week in five numbers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-primary/20">
              <tr><th className="py-3 pr-4">Average measured generation</th><td className="py-3 text-foreground/70">~12.0 GW across available settlement-period aggregates</td></tr>
              <tr><th className="py-3 pr-4">Highest renewable share</th><td className="py-3 text-foreground/70">53.2% on Sunday 10 May</td></tr>
              <tr><th className="py-3 pr-4">Highest average wind output</th><td className="py-3 text-foreground/70">~4.0 GW on Sunday 10 May</td></tr>
              <tr><th className="py-3 pr-4">Highest average solar output</th><td className="py-3 text-foreground/70">~1.9 GW on Saturday 9 May</td></tr>
              <tr><th className="py-3 pr-4">Highest average gas output</th><td className="py-3 text-foreground/70">~5.7 GW on Thursday 7 May</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Wind, solar and renewables</h2>
        <p>Sunday 10 May was the standout renewable day in the available 7-day feed, with wind doing most of the work. Saturday 9 May had the strongest average solar output, reflecting the usual daylight-driven pattern where solar helps most around the middle of the day rather than during evening peaks.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Gas generation</h2>
        <p>Gas was highest on Thursday 7 May in the available data, then materially lower over the weekend. That is the pattern EnergyMix.info should keep explaining: gas is often the flexible source that rises when demand, weather or system conditions require it.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Practical takeaway</h2>
        <p>For flexible electricity use, the cleanest opportunities are likely to appear when wind is strong, gas is low and demand is not at a peak. This is the foundation for future “cleanest time to use electricity” alerts, EV-charging guidance and weekly newsletter summaries.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Data notes</h2>
        <p>This first report uses the site’s available 7-day historical generation feed. Carbon-intensity highs/lows and interconnector summaries should be added once the reporting pipeline has reliable historical carbon and flow aggregates.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Live dashboard</Link>
          <Link to="/today" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Today’s electricity mix</Link>
          <Link to="/carbon-intensity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Carbon intensity</Link>
          <Link to="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</Link>
        </div>
      </section>
    </StaticPageLayout>
  </>
);
