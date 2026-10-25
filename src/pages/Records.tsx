import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';
import { reportCoverage } from '@/lib/evidence/reportCoverage.mjs';

const archiveWindow = reportCoverage(generated.reports[0]);
const RecordScope = () => <section aria-label="Record coverage" className="rounded-lg border border-primary/20 p-5"><h2 className="text-2xl font-semibold text-primary mb-3">Highs within the available archive, not all-time records</h2><p>{archiveWindow.label}. {archiveWindow.detail}</p><p className="mt-3">These are archived daily-average highs for that reporting window, not live peaks or a complete historical record. Original figures and dates are preserved.</p><p className="mt-3">{archiveWindow.definition}</p></section>;

type RecordPage = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  currentRecord: string;
  why: string;
  notes: string[];
  related: { to: string; label: string }[];
};

const recordPages: Record<string, RecordPage> = {
  '/records/highest-renewable-share': {
    slug: '/records/highest-renewable-share',
    title: 'Highest Renewable Share Record',
    metaTitle: 'Highest Renewable Share | UK Electricity Mix Records',
    description: 'EnergyMix.info record page for Britain’s highest renewable electricity share, with source notes and related live dashboard links.',
    currentRecord: generated.records.highestRenewableShare.text,
    why: 'Renewable share records are useful because they show when wind, solar and hydro are doing enough work to materially reduce fossil generation and carbon intensity.',
    notes: ['This is an initial record from the current reporting feed, not yet an all-time archive.', 'Future versions should track settlement-period highs, daily highs and all-time records separately.', 'Renewable share here uses wind, solar and hydro from available generation categories.'],
    related: [{ to: '/renewables', label: 'Renewables' }, { to: '/reports/weekly/2026-05-11', label: 'Weekly report' }, { to: '/', label: 'Live dashboard' }],
  },
  '/records/highest-wind-generation': {
    slug: '/records/highest-wind-generation',
    title: 'Highest Wind Generation Record',
    metaTitle: 'Highest Wind Generation | UK Electricity Mix Records',
    description: 'EnergyMix.info record page for Britain’s highest wind generation observations and wind-led electricity mix periods.',
    currentRecord: generated.records.highestWindGeneration.text,
    why: 'Wind is often the largest swing factor in Britain’s electricity mix. High wind periods can lower gas generation and create cleaner electricity windows.',
    notes: ['This record uses daily averages from the declared archive window; complete interval coverage has not been independently verified.', 'Future versions should add settlement-period wind peaks and all-time UK wind records.', 'A share or citation should include the archive window and daily-average basis.'],
    related: [{ to: '/renewables', label: 'Renewables' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/reports', label: 'Reports' }],
  },
  '/records/highest-solar-generation': {
    slug: '/records/highest-solar-generation',
    title: 'Highest Solar Generation Record',
    metaTitle: 'Highest Solar Generation | UK Electricity Mix Records',
    description: 'EnergyMix.info record page for Britain’s strongest solar generation periods and solar contribution to the daily electricity mix.',
    currentRecord: generated.records.highestSolarGeneration.text,
    why: 'Solar records matter because solar reshapes the daytime grid, often lowering gas demand through the middle of bright days.',
    notes: ['Solar is highly seasonal and time-of-day dependent.', 'Future versions should distinguish daily averages from midday peak solar output.', 'Historical solar highs are not a forecast for today or an electricity-price signal.'],
    related: [{ to: '/renewables', label: 'Renewables' }, { to: '/cleanest-time-to-use-electricity', label: 'Cleanest time' }, { to: '/today', label: 'Today' }],
  },
  '/records/highest-gas-generation': {
    slug: '/records/highest-gas-generation',
    title: 'Highest Gas Generation Record',
    metaTitle: 'Highest Gas Generation | UK Electricity Mix Records',
    description: 'EnergyMix.info record page for high gas generation periods, demand peaks and carbon-intensive electricity mix conditions.',
    currentRecord: generated.records.highestGasGeneration.text,
    why: 'Gas highs show when the system is leaning more heavily on flexible fossil generation, often because demand is high or wind and solar are lower.',
    notes: ['This is a reporting-window high, not an all-time record.', 'Future versions should add gas share, settlement-period highs and carbon-intensity context.', 'Gas records should be framed carefully as system explanation, not sensationalism.'],
    related: [{ to: '/gas-generation', label: 'Gas generation' }, { to: '/electricity-demand', label: 'Demand' }, { to: '/carbon-intensity', label: 'Carbon intensity' }],
  },
};

export const RecordsIndex = () => (
  <>
    <Helmet>
      <title>UK Electricity Mix Records | Wind, Solar, Renewables and Gas</title>
      <meta name="description" content="EnergyMix.info records hub for Britain’s electricity mix: renewable share, wind generation, solar generation, gas generation and future carbon-intensity records." />
      <link rel="canonical" href="https://energymix.info/records/" />
      <meta property="og:title" content="UK Electricity Mix Records" />
      <meta property="og:description" content="Track notable electricity mix records for renewables, wind, solar and gas." />
      <meta property="og:url" content="https://energymix.info/records/" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
    </Helmet>
    <StaticPageLayout eyebrow="Records" title="UK Electricity Mix Records" intro="A records hub for notable British electricity mix moments: renewable share highs, wind and solar peaks, gas-heavy periods and future carbon-intensity records.">
      <RecordScope />
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Archived reporting-window highs</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.values(recordPages).map((record) => (
            <Link key={record.slug} to={record.slug} className="rounded-lg border border-primary/20 bg-background/40 p-5 hover:bg-primary/10 transition-colors">
              <h3 className="text-xl font-semibold text-cosmic-cyan">{record.title}</h3>
              <p className="mt-2 text-foreground/75">{record.currentRecord}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Record methodology</h2>
        <p>These figures use the declared archived reporting window shown above. An available-feed high is not an all-time record; missing intervals and differing definitions limit comparisons.</p>
      </section>
    </StaticPageLayout>
  </>
);

const RecordDetail = ({ page }: { page: RecordPage }) => (
  <>
    <Helmet>
      <title>{page.metaTitle}</title>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={`https://energymix.info${page.slug}/`} />
      <meta property="og:title" content={page.metaTitle} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={`https://energymix.info${page.slug}/`} />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
    </Helmet>
    <StaticPageLayout eyebrow="Archived reporting-window high" title={page.title} intro={page.description}>
      <RecordScope />
      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <h2 className="text-2xl font-semibold text-primary mb-3">Archived daily-average high</h2>
        <p>{page.currentRecord}</p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Why this record matters</h2>
        <p>{page.why}</p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Source notes</h2>
        <ul className="space-y-2 list-disc pl-5">{page.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
        <div className="grid md:grid-cols-2 gap-3">{page.related.map((link) => <Link key={link.to} to={link.to} className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">{link.label}</Link>)}</div>
      </section>
    </StaticPageLayout>
  </>
);

export const HighestRenewableShare = () => <RecordDetail page={recordPages['/records/highest-renewable-share']} />;
export const HighestWindGeneration = () => <RecordDetail page={recordPages['/records/highest-wind-generation']} />;
export const HighestSolarGeneration = () => <RecordDetail page={recordPages['/records/highest-solar-generation']} />;
export const HighestGasGeneration = () => <RecordDetail page={recordPages['/records/highest-gas-generation']} />;
