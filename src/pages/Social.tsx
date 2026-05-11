import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const posts = [
  {
    title: 'Monday weekly grid brief',
    body: `Last week in Britain’s electricity mix:\n\n• Highest renewable share in the available feed: 53.2% on Sunday 10 May\n• Highest average wind output: ~4.0 GW on Sunday 10 May\n• Highest average solar output: ~1.9 GW on Saturday 9 May\n• Highest average gas output: ~5.7 GW on Thursday 7 May\n\nThe shift was clear: gas-heavy weekdays gave way to a cleaner, wind-led weekend.\n\nFull report: https://energymix.info/reports/weekly/2026-05-11`,
  },
  {
    title: 'Wednesday explainer',
    body: `What does “UK electricity mix” actually mean?\n\nFor live grid dashboards, it usually means Great Britain’s electricity system: England, Scotland and Wales. Northern Ireland is part of the UK, but operates in a separate electricity market.\n\nThat distinction matters if you’re citing live generation, demand, carbon intensity or renewables data.\n\nExplainer: https://energymix.info/uk-electricity-mix`,
  },
  {
    title: 'Friday practical clean-electricity post',
    body: `The cleanest time to use electricity is not a fixed hour.\n\nIt changes with wind, solar, demand, imports and gas generation. Windy overnight periods and sunny middays can be much cleaner than still early-evening peaks.\n\nUseful for EV charging, home batteries, appliances and flexible business demand.\n\nGuide: https://energymix.info/cleanest-time-to-use-electricity`,
  },
];

const Social = () => (
  <>
    <Helmet>
      <title>Energy Mix LinkedIn Post Templates | Weekly Grid Briefs</title>
      <meta name="description" content="Ready-to-use LinkedIn post templates for EnergyMix.info weekly grid briefs, electricity explainers and clean-electricity updates." />
      <link rel="canonical" href="https://energymix.info/social" />
      <meta property="og:title" content="Energy Mix LinkedIn Post Templates" />
      <meta property="og:description" content="Weekly LinkedIn distribution copy for EnergyMix.info reports and explainers." />
      <meta property="og:url" content="https://energymix.info/social" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="noindex, follow" />
    </Helmet>
    <StaticPageLayout eyebrow="Distribution" title="LinkedIn post templates" intro="A practical posting queue for turning EnergyMix.info reports and explainers into LinkedIn distribution. This page is useful operationally, but marked noindex so it does not compete with public report pages.">
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">This week’s posts</h2>
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.title} className="rounded-lg border border-primary/20 bg-background/40 p-5">
              <h3 className="text-xl font-semibold text-cosmic-cyan mb-3">{post.title}</h3>
              <pre className="whitespace-pre-wrap text-sm md:text-base font-sans leading-relaxed text-foreground/85">{post.body}</pre>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Posting rhythm</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Monday: weekly grid brief linking to the latest report.</li>
          <li>Wednesday: plain-English explainer linking to a topic page.</li>
          <li>Friday: live moment, record watch or practical clean-electricity post.</li>
        </ul>
        <p className="mt-4"><Link to="/reports" className="text-cosmic-cyan hover:underline">Use the reports archive</Link> as the source of truth for weekly posts.</p>
      </section>
    </StaticPageLayout>
  </>
);

export default Social;
