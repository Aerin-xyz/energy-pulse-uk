import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';

const useCases = [
  {
    title: 'Embeddable live widgets',
    body: 'Small cards for publishers, communities or businesses that want live GB power-flow, renewable share or carbon-intensity context without building the data plumbing themselves.',
  },
  {
    title: 'Briefings and explainers',
    body: 'Plain-English weekly summaries for readers who want to understand why the grid was clean, gas-heavy, import-heavy or wind-led.',
  },
  {
    title: 'Data-access pilots',
    body: 'A future lightweight API surface for selected live summaries, source freshness and historical observations where reuse makes commercial sense.',
  },
];

const Partners = () => (
  <>
    <Helmet>
      <title>Energy Mix for Publishers, Widgets and Data Access</title>
      <meta name="description" content="Register interest in Energy Mix widgets, live GB electricity summaries, publisher explainers and future data access pilots." />
      <link rel="canonical" href="https://energymix.info/partners/" />
      <meta property="og:title" content="Energy Mix widgets and data access" />
      <meta property="og:description" content="Future embeddable widgets, live summaries and data-access pilots from Energy Mix." />
      <meta property="og:url" content="https://energymix.info/partners/" />
      <meta property="og:image" content="https://energymix.info/og-data.jpg" />
      <meta name="robots" content="index, follow" />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Energy Mix widgets and data access',
          provider: { '@type': 'Organization', name: 'Energy Mix', url: 'https://energymix.info/' },
          areaServed: 'GB',
          serviceType: 'Electricity data visualisation and briefing',
          url: 'https://energymix.info/partners/',
        })}
      </script>
    </Helmet>

    <StaticPageLayout
      eyebrow="Publisher and partner access"
      title="Energy Mix widgets and data access"
      intro="A quiet landing page for the commercial layer: simple live grid summaries, embeddable cards and useful data access — without crowding the public dashboard."
    >
      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">What we are packaging</h2>
        <p>
          Energy Mix is being built around a clean public dashboard first. The reusable layer is intentionally narrow: live summaries people can understand, source transparency, and carefully scoped widgets or feeds for organisations that need energy context.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-4">Potential use cases</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {useCases.map((item) => (
            <div key={item.title} className="rounded-lg border border-primary/15 bg-background/30 p-4">
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-foreground/75">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Useful starting points</h2>
        <ul className="grid md:grid-cols-2 gap-3">
          <li><Link to="/power-flow" className="block rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">Live power-flow visualisation</Link></li>
          <li><Link to="/data" className="block rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">Data sources and methodology</Link></li>
          <li><Link to="/reports" className="block rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">Weekly energy reports</Link></li>
          <li><Link to="/citation" className="block rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">Citation guidance</Link></li>
        </ul>
      </section>

      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Register interest</h2>
        <p className="mb-4">If a widget, briefing, API pilot or data partnership would be useful, send a short note with the use case. We are prioritising simple, high-signal formats rather than broad data dumps.</p>
        <Link to="/contact"><Button variant="outline">Contact about widgets or data access</Button></Link>
      </section>
    </StaticPageLayout>
  </>
);

export default Partners;
