import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const terms = [
  {
    term: 'Carbon intensity',
    definition: 'An estimate of the carbon dioxide emissions associated with each unit of electricity consumed, usually shown in grams of CO₂ per kilowatt-hour.',
    links: [{ to: '/carbon-intensity', label: 'Carbon intensity guide' }],
  },
  {
    term: 'Electricity mix',
    definition: 'The blend of sources generating electricity at a point in time, such as wind, solar, gas, nuclear, biomass, hydro, storage and imports.',
    links: [{ to: '/uk-electricity-mix', label: 'UK electricity mix' }],
  },
  {
    term: 'FUELINST',
    definition: 'Elexon’s near-real-time fuel type data for Great Britain’s transmission-connected electricity generation.',
    links: [{ to: '/data', label: 'Data sources' }],
  },
  {
    term: 'Interconnector',
    definition: 'A high-voltage electricity link between Britain and another market. It can import power into Britain or export British power abroad.',
    links: [{ to: '/interconnectors', label: 'Interconnectors explained' }],
  },
  {
    term: 'Low-carbon electricity',
    definition: 'Electricity from sources with low operational emissions, commonly including wind, solar, nuclear, hydro and some imports depending on source mix.',
    links: [{ to: '/renewables', label: 'Renewables' }, { to: '/nuclear-power', label: 'Nuclear power' }],
  },
  {
    term: 'Renewable share',
    definition: 'The proportion of visible electricity generation coming from renewable sources such as wind, solar and hydro. Biomass treatment can vary by dataset.',
    links: [{ to: '/renewables', label: 'Renewable electricity' }],
  },
  {
    term: 'Settlement period',
    definition: 'A 30-minute electricity-market accounting window. Some official figures arrive or settle on this cadence rather than second-by-second.',
    links: [{ to: '/methodology', label: 'Methodology' }],
  },
  {
    term: 'System demand',
    definition: 'A measure of how much electricity the grid needs at a given time. Definitions differ between datasets, especially around embedded generation and storage.',
    links: [{ to: '/electricity-demand', label: 'Electricity demand' }],
  },
  {
    term: 'Wind generation',
    definition: 'Electricity generated from onshore and offshore wind. It is often the biggest swing factor in Britain’s live electricity mix.',
    links: [{ to: '/renewables', label: 'Renewables' }],
  },
];

const Glossary = () => (
  <>
    <Helmet>
      <title>UK Electricity Glossary | Energy Mix Terms Explained</title>
      <meta name="description" content="Plain-English glossary for UK electricity mix terms: carbon intensity, FUELINST, interconnectors, renewable share, settlement periods and demand." />
      <link rel="canonical" href="https://energymix.info/glossary" />
      <meta property="og:title" content="UK Electricity Glossary" />
      <meta property="og:description" content="Plain-English definitions for the key terms used in Energy Mix." />
      <meta property="og:url" content="https://energymix.info/glossary" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'UK electricity glossary',
          url: 'https://energymix.info/glossary',
          hasDefinedTerm: terms.map((item) => ({
            '@type': 'DefinedTerm',
            name: item.term,
            description: item.definition,
          })),
        })}
      </script>
    </Helmet>

    <StaticPageLayout
      eyebrow="Plain-English reference"
      title="UK electricity glossary"
      intro="A compact guide to the terms used across Energy Mix. Built for readers who want the picture quickly, without turning the dashboard into a textbook."
    >
      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Quick answer</h2>
        <p>
          Energy Mix uses electricity-system language carefully: most live figures refer to Great Britain, not the whole UK electricity market, and source categories can vary between datasets. This glossary links the key terms back to the relevant live pages.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-4">Terms</h2>
        <dl className="grid gap-4">
          {terms.map((item) => (
            <div key={item.term} className="rounded-lg border border-primary/15 bg-background/30 p-4">
              <dt className="text-lg font-semibold text-foreground">{item.term}</dt>
              <dd className="mt-2 text-foreground/80">{item.definition}</dd>
              <dd className="mt-3 flex flex-wrap gap-2">
                {item.links.map((link) => (
                  <Link key={link.to} to={link.to} className="text-sm text-cosmic-cyan hover:underline">
                    {link.label}
                  </Link>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </StaticPageLayout>
  </>
);

export default Glossary;
