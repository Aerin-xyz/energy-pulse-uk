import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import snapshot from '@/data/staticGridSnapshot.json';
import generated from '@/data/energyMixGenerated.json';

type DisplayKey = keyof typeof snapshot.display;

interface InsightPage {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  intro: string;
  primaryMetric: {
    label: string;
    value: string;
    detail: string;
  };
  contextMetrics: Array<{
    label: string;
    value: string;
  }>;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  related: Array<{
    to: string;
    label: string;
  }>;
}

const formatSnapshotTime = (timestamp?: string | null) =>
  timestamp
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/London',
      }).format(new Date(timestamp))
    : 'the latest build-time snapshot';

const metricValue = (key: DisplayKey, fallback: string) => snapshot.display[key] || fallback;

const snapshotTime = formatSnapshotTime(snapshot.timestamp);
const weeklyReport = generated.reports[0];

const sharedRelated = [
  { to: '/', label: 'Live dashboard' },
  { to: '/today', label: "Today's electricity mix" },
  { to: '/reports', label: 'Weekly reports' },
  { to: '/data', label: 'Data sources and methodology' },
];

const pages: Record<string, InsightPage> = {
  '/uk-wind-power-today': {
    slug: '/uk-wind-power-today',
    eyebrow: 'Wind power today',
    title: 'UK Wind Power Today',
    metaTitle: 'UK Wind Power Today | Live GB Wind Generation',
    description: 'Track UK wind power today with current GB wind generation, renewable-share context and plain-English electricity mix analysis.',
    intro: "A durable landing page for checking how much wind power is contributing to Britain's electricity mix today, with live-dashboard links and stable snapshot context.",
    primaryMetric: {
      label: 'Wind generation',
      value: metricValue('wind', 'Awaiting wind snapshot'),
      detail: `Latest static snapshot from ${snapshotTime}.`,
    },
    contextMetrics: [
      { label: 'Renewable share', value: metricValue('renewableShare', 'Awaiting renewable snapshot') },
      { label: 'Measured generation', value: metricValue('generation', 'Awaiting generation snapshot') },
      { label: 'Gas generation', value: metricValue('gas', 'Awaiting gas snapshot') },
      { label: 'Carbon intensity', value: metricValue('carbonIntensity', 'Awaiting carbon snapshot') },
    ],
    sections: [
      {
        heading: 'What wind power means for the grid today',
        body: [
          'Wind is often the biggest swing source in the GB electricity mix. When wind output rises, renewable share tends to improve and gas generation can fall if demand and interconnector flows allow it.',
          'The live dashboard is the best place to check the current half-hourly picture. This landing page keeps the search page stable while pointing readers to the current wind, gas and carbon signals.',
        ],
      },
      {
        heading: 'Recent wind context',
        body: [
          `${weeklyReport.highlights[0].value} ${weeklyReport.summary}`,
          'Wind output varies with weather systems, so daily and weekly comparisons are more useful than a single instant when judging whether today is especially windy.',
        ],
      },
    ],
    faqs: [
      { question: 'Is UK wind power the same all day?', answer: 'No. Wind generation changes through the day as weather conditions move across wind farms and as grid balancing decisions are made.' },
      { question: 'Does high wind make electricity cleaner?', answer: 'Usually yes, especially when high wind reduces gas generation. Carbon intensity also depends on demand, nuclear output, imports and other sources.' },
    ],
    related: [
      { to: '/renewables-share-today', label: 'Renewables share today' },
      { to: '/carbon-intensity-today', label: 'Carbon intensity today' },
      { to: '/renewables', label: 'Renewables explained' },
      ...sharedRelated,
    ],
  },
  '/uk-solar-power-today': {
    slug: '/uk-solar-power-today',
    eyebrow: 'Solar power today',
    title: 'UK Solar Power Today',
    metaTitle: 'UK Solar Power Today | Live GB Solar Generation',
    description: 'Track UK solar power today with current GB solar generation, renewable-share context and plain-English electricity mix analysis.',
    intro: "A durable landing page for checking how much solar power is contributing to Britain's electricity mix today, with current-grid context and settled report links.",
    primaryMetric: {
      label: 'Solar generation',
      value: metricValue('solar', 'Awaiting solar snapshot'),
      detail: `Latest static snapshot from ${snapshotTime}. Solar is strongly time-of-day and season dependent.`,
    },
    contextMetrics: [
      { label: 'Renewable share', value: metricValue('renewableShare', 'Awaiting renewable snapshot') },
      { label: 'Measured generation', value: metricValue('generation', 'Awaiting generation snapshot') },
      { label: 'Demand', value: metricValue('demand', 'Awaiting demand snapshot') },
      { label: 'Carbon intensity', value: metricValue('carbonIntensity', 'Awaiting carbon snapshot') },
    ],
    sections: [
      {
        heading: 'How to read solar power today',
        body: [
          'Solar output follows daylight, weather and the season. It is usually strongest around the middle of bright days and can be near zero overnight.',
          'Because much solar generation is embedded in distribution networks, measured grid demand can also fall when rooftop and local solar are strong.',
        ],
      },
      {
        heading: 'Recent solar context',
        body: [
          `${weeklyReport.highlights[1].value} The latest settled daily summary says: ${generated.yesterday.summary}`,
          'Use solar alongside wind, demand and gas generation rather than reading it as a standalone cleanliness signal.',
        ],
      },
    ],
    faqs: [
      { question: 'Why is solar low at night?', answer: 'Solar generation depends on daylight, so live solar values are normally very low or zero overnight.' },
      { question: 'Can solar lower carbon intensity?', answer: 'Yes. Solar can lower carbon intensity when it displaces fossil generation, especially during bright lower-demand periods.' },
    ],
    related: [
      { to: '/renewables-share-today', label: 'Renewables share today' },
      { to: '/uk-wind-power-today', label: 'Wind power today' },
      { to: '/renewables', label: 'Renewables explained' },
      ...sharedRelated,
    ],
  },
  '/gas-share-of-electricity': {
    slug: '/gas-share-of-electricity',
    eyebrow: 'Gas share',
    title: 'Gas Share of UK Electricity',
    metaTitle: 'Gas Share of UK Electricity | Live GB Gas Generation',
    description: 'Check the current gas share of UK electricity generation and understand how gas affects carbon intensity in the GB electricity mix.',
    intro: "A durable landing page for understanding how much of Britain's electricity is currently coming from gas and why that matters for emissions.",
    primaryMetric: {
      label: 'Gas share',
      value: metricValue('gasShare', 'Awaiting gas-share snapshot'),
      detail: `Latest static snapshot from ${snapshotTime}. Gas generation was ${metricValue('gas', 'awaiting gas snapshot')}.`,
    },
    contextMetrics: [
      { label: 'Gas generation', value: metricValue('gas', 'Awaiting gas snapshot') },
      { label: 'Renewable share', value: metricValue('renewableShare', 'Awaiting renewable snapshot') },
      { label: 'Measured generation', value: metricValue('generation', 'Awaiting generation snapshot') },
      { label: 'Carbon intensity', value: metricValue('carbonIntensity', 'Awaiting carbon snapshot') },
    ],
    sections: [
      {
        heading: 'Why gas share matters',
        body: [
          'Gas-fired generation is flexible and often responds when demand is high, wind is low or other sources are unavailable. That flexibility makes gas important for balancing, but it also raises carbon intensity compared with low-carbon sources.',
          "A higher gas share is usually a sign that today's electricity mix is more carbon intensive, although imports, nuclear output and demand also affect the final carbon-intensity value.",
        ],
      },
      {
        heading: 'Recent gas context',
        body: [
          `${weeklyReport.highlights[2].value}`,
          'Gas-heavy periods are useful to watch for flexible demand: EV charging, appliance use and battery charging may have cleaner alternatives when wind, solar or lower demand improve the mix.',
        ],
      },
    ],
    faqs: [
      { question: 'Is gas always the marginal generator?', answer: 'No. Gas is often important at the margin in GB, but the actual marginal source changes with demand, imports, renewables and market conditions.' },
      { question: 'Does a low gas share mean low carbon electricity?', answer: 'Often, but not automatically. Carbon intensity also depends on the rest of the mix, including imports and other fossil or low-carbon sources.' },
    ],
    related: [
      { to: '/carbon-intensity-today', label: 'Carbon intensity today' },
      { to: '/renewables-share-today', label: 'Renewables share today' },
      { to: '/gas-generation', label: 'Gas generation explained' },
      ...sharedRelated,
    ],
  },
  '/renewables-share-today': {
    slug: '/renewables-share-today',
    eyebrow: 'Renewables today',
    title: 'Renewables Share Today',
    metaTitle: 'Renewables Share Today | UK Electricity Mix',
    description: "Check today's renewable share of UK electricity generation, including wind and solar context for the live GB electricity mix.",
    intro: "A durable landing page for today's renewable electricity share, bringing together wind, solar, hydro and wider grid context.",
    primaryMetric: {
      label: 'Renewable share',
      value: metricValue('renewableShare', 'Awaiting renewable-share snapshot'),
      detail: `Latest static snapshot from ${snapshotTime}.`,
    },
    contextMetrics: [
      { label: 'Wind generation', value: metricValue('wind', 'Awaiting wind snapshot') },
      { label: 'Solar generation', value: metricValue('solar', 'Awaiting solar snapshot') },
      { label: 'Gas share', value: metricValue('gasShare', 'Awaiting gas-share snapshot') },
      { label: 'Carbon intensity', value: metricValue('carbonIntensity', 'Awaiting carbon snapshot') },
    ],
    sections: [
      {
        heading: 'What counts in the renewable share',
        body: [
          'Energy Mix treats renewable share as the share of measured generation coming from renewable sources such as wind, solar and hydro. It is a practical live-grid metric rather than a billing-grade certificate measure.',
          'The renewable share can change quickly as weather-driven generation moves and demand rises or falls.',
        ],
      },
      {
        heading: 'Recent renewable context',
        body: [
          `The latest weekly report says renewables averaged ${weeklyReport.metrics[1][1]}, with ${weeklyReport.metrics[2][1]}.`,
          `${generated.records.highestRenewableShare.text}`,
        ],
      },
    ],
    faqs: [
      { question: 'Does renewable share include nuclear?', answer: 'No. Nuclear is low-carbon, but it is not counted as renewable in these share calculations.' },
      { question: 'Is high renewable share always low carbon?', answer: 'It is usually a strong low-carbon signal, but carbon intensity also depends on gas, imports, demand and other generation.' },
    ],
    related: [
      { to: '/uk-wind-power-today', label: 'Wind power today' },
      { to: '/uk-solar-power-today', label: 'Solar power today' },
      { to: '/renewables', label: 'Renewables explained' },
      ...sharedRelated,
    ],
  },
  '/carbon-intensity-today': {
    slug: '/carbon-intensity-today',
    eyebrow: 'Carbon intensity today',
    title: 'UK Carbon Intensity Today',
    metaTitle: 'UK Carbon Intensity Today | Live GB Electricity Emissions',
    description: 'Check UK carbon intensity today with current GB electricity emissions context, renewable share, gas generation and demand.',
    intro: "A durable landing page for today's electricity carbon intensity in Great Britain, linking the live emissions signal to renewables, gas and demand.",
    primaryMetric: {
      label: 'Carbon intensity',
      value: metricValue('carbonIntensity', 'Awaiting carbon snapshot'),
      detail: `Latest static snapshot from ${snapshotTime}; current index: ${metricValue('carbonIndex', 'awaiting index')}.`,
    },
    contextMetrics: [
      { label: 'Renewable share', value: metricValue('renewableShare', 'Awaiting renewable snapshot') },
      { label: 'Gas share', value: metricValue('gasShare', 'Awaiting gas-share snapshot') },
      { label: 'Demand', value: metricValue('demand', 'Awaiting demand snapshot') },
      { label: 'Imports / exports', value: metricValue('importsExports', 'Awaiting import snapshot') },
    ],
    sections: [
      {
        heading: 'What carbon intensity means today',
        body: [
          'Electricity carbon intensity estimates the grams of CO2-equivalent emitted for each kilowatt-hour consumed. Lower values usually appear when wind, solar, nuclear and other low-carbon sources make up more of the mix.',
          "Today's carbon intensity can move from one settlement period to the next, so it is best read alongside renewable share, gas share and demand.",
        ],
      },
      {
        heading: 'Using the signal',
        body: [
          'For flexible electricity use, look for lower-carbon windows where renewable share is strong and gas generation is lower. Price and carbon signals can overlap, but they are not the same thing.',
          weeklyReport.takeaway,
        ],
      },
    ],
    faqs: [
      { question: 'What is a good carbon intensity today?', answer: 'There is no single fixed threshold. Lower is better, and the most useful comparison is against nearby periods today and settled daily or weekly reports.' },
      { question: 'Is carbon intensity live or settled?', answer: 'The dashboard signal is live or near-live. Settled historical summaries are more stable for comparison and citation.' },
    ],
    related: [
      { to: '/renewables-share-today', label: 'Renewables share today' },
      { to: '/gas-share-of-electricity', label: 'Gas share of electricity' },
      { to: '/carbon-intensity', label: 'Carbon intensity explained' },
      ...sharedRelated,
    ],
  },
};

const canonicalPath = (slug: string) => `${slug}/`;

const InsightPage = ({ page }: { page: InsightPage }) => (
  <>
    <Helmet>
      <title>{page.metaTitle}</title>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={`https://energymix.info${canonicalPath(page.slug)}`} />
      <meta property="og:title" content={page.metaTitle} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={`https://energymix.info${canonicalPath(page.slug)}`} />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="index, follow" />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: page.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        })}
      </script>
    </Helmet>

    <StaticPageLayout eyebrow={page.eyebrow} title={page.title} intro={page.intro}>
      <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
        <p className="text-sm uppercase tracking-[0.18em] text-primary/75">{page.primaryMetric.label}</p>
        <p className="mt-2 text-4xl font-bold text-foreground">{page.primaryMetric.value}</p>
        <p className="mt-3 text-sm text-foreground/65">{page.primaryMetric.detail}</p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Current grid context</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {page.contextMetrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-primary/20 bg-background/40 p-4">
              <h3 className="font-semibold">{metric.label}</h3>
              <p className="text-foreground/75 mt-1">{metric.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-foreground/60">Snapshot source: {snapshot.source}. Live dashboard values may have moved since this static crawlable snapshot.</p>
      </section>

      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-2xl font-semibold text-primary mb-3">{section.heading}</h2>
          <div className="space-y-3">
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">FAQs</h2>
        <div className="space-y-4">
          {page.faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              <p className="mt-1 text-foreground/80">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Related pages</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {page.related.map((link) => (
            <Link key={link.to} to={link.to} className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </StaticPageLayout>
  </>
);

export const UkWindPowerToday = () => <InsightPage page={pages['/uk-wind-power-today']} />;
export const UkSolarPowerToday = () => <InsightPage page={pages['/uk-solar-power-today']} />;
export const GasShareOfElectricity = () => <InsightPage page={pages['/gas-share-of-electricity']} />;
export const RenewablesShareToday = () => <InsightPage page={pages['/renewables-share-today']} />;
export const CarbonIntensityToday = () => <InsightPage page={pages['/carbon-intensity-today']} />;
