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
      intro="This is the first EnergyMix.info weekly report shell. It establishes the public report format now, while measured weekly summaries can be automated and backfilled from reliable historical data."
    >
      <section className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Status</h2>
        <p>This report is a template edition, not a final measured weekly dataset. It is published to establish the report architecture, internal links, structured data and newsletter workflow before automated weekly statistics are added.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Summary</h2>
        <p>Future weekly reports will explain how Britain’s electricity mix changed during the week, which periods were cleanest or most carbon intensive, and what practical lessons follow for EV charging, home batteries, flexible appliances and business energy use.</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">The week in five numbers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-primary/20">
              <tr><th className="py-3 pr-4">Average carbon intensity</th><td className="py-3 text-foreground/70">To be calculated from historical data</td></tr>
              <tr><th className="py-3 pr-4">Highest renewable share</th><td className="py-3 text-foreground/70">To be calculated from historical data</td></tr>
              <tr><th className="py-3 pr-4">Highest wind output</th><td className="py-3 text-foreground/70">To be calculated from historical data</td></tr>
              <tr><th className="py-3 pr-4">Peak demand</th><td className="py-3 text-foreground/70">To be calculated from historical data</td></tr>
              <tr><th className="py-3 pr-4">Highest gas share</th><td className="py-3 text-foreground/70">To be calculated from historical data</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Report sections to populate</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Cleanest period of the week and what caused it.</li>
          <li>Highest-carbon period of the week and what caused it.</li>
          <li>Wind, solar and renewable generation highlights.</li>
          <li>Gas generation and demand peak context.</li>
          <li>Interconnector import/export patterns where available.</li>
          <li>One practical takeaway for flexible electricity use.</li>
        </ul>
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
