import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

type Explainer = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  intro: string;
  shortAnswer: string;
  sections: { heading: string; body: string[]; bullets?: string[] }[];
  faqs: { question: string; answer: string }[];
  related: { to: string; label: string }[];
};

const explainers: Record<string, Explainer> = {
  '/uk-electricity-mix': {
    slug: '/uk-electricity-mix',
    title: 'UK Electricity Mix',
    metaTitle: 'UK Electricity Mix | Live GB Generation by Source',
    description: 'Plain-English guide to the UK electricity mix, covering Great Britain generation by source, demand, renewables, gas, nuclear, imports and carbon intensity.',
    eyebrow: 'Electricity mix explained',
    intro: 'The UK electricity mix is the blend of sources generating power at a given moment. EnergyMix.info focuses on live Great Britain electricity data and explains how wind, solar, gas, nuclear, imports, storage and demand shape the grid.',
    shortAnswer: 'The UK electricity mix changes throughout the day as demand rises and falls and weather-dependent generation such as wind and solar moves up or down. Most live data covers Great Britain — England, Scotland and Wales — while Northern Ireland operates in a separate electricity market.',
    sections: [
      { heading: 'UK electricity mix right now', body: ['Use the live dashboard to see the current generation mix, demand, carbon intensity, renewables share, gas output, nuclear generation and interconnector flows. These values change as settlement periods update and source systems publish fresh data.'] },
      { heading: 'What is the electricity mix?', body: ['The electricity mix is the share of generation coming from each source. In Britain this usually includes wind, solar, gas, nuclear, biomass, hydro, storage, imports and other smaller categories. It is different from the total UK energy mix, which also includes transport fuels, heating, oil, industrial energy and other non-electricity uses.'] },
      { heading: 'Main generation sources', body: ['Britain’s live electricity mix is shaped by a handful of major categories. Each behaves differently, which is why the grid can look very different on a windy night, a still winter evening or a bright summer lunchtime.'], bullets: ['Wind can be the largest source during windy periods, especially overnight and in winter.', 'Solar is strongest around the middle of the day and falls rapidly in the evening.', 'Gas often fills gaps when demand is high or renewable output is low.', 'Nuclear provides steadier low-carbon output, subject to maintenance and outages.', 'Interconnectors import or export electricity depending on prices, demand and neighbouring systems.'] },
      { heading: 'How the mix changes during the day', body: ['Demand usually rises in the morning, dips through parts of the day, and peaks in the early evening. Solar can reduce daytime gas demand, while wind can lower carbon intensity for hours or days at a time. When demand is high and wind is low, gas generation typically increases.'] },
      { heading: 'Data sources and interpretation', body: ['EnergyMix.info uses public electricity and carbon-intensity data to make these movements easier to understand. Live figures can lag, source categories can differ, and some values may be revised, so the best use of the dashboard is as a timely public explanation rather than a billing-grade meter.'] },
    ],
    faqs: [
      { question: 'Does this cover the whole UK?', answer: 'Most live electricity-grid data covers Great Britain: England, Scotland and Wales. Northern Ireland is part of the UK but has a separate electricity market.' },
      { question: 'Why does gas generation change so much?', answer: 'Gas plants are flexible, so they often increase when demand rises, wind falls, solar drops after sunset or imports are less favourable.' },
      { question: 'Is the electricity mix the same as carbon intensity?', answer: 'No. The mix shows generation by source, while carbon intensity estimates the emissions associated with electricity consumption.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/renewables', label: 'Renewables' }, { to: '/methodology', label: 'Methodology' }],
  },
  '/carbon-intensity': {
    slug: '/carbon-intensity',
    title: 'UK Carbon Intensity',
    metaTitle: 'UK Carbon Intensity Live | Grid CO₂ and Clean Electricity Windows',
    description: 'Understand UK electricity carbon intensity, why it changes and how to use cleaner grid periods for EV charging, appliances, batteries and business load shifting.',
    eyebrow: 'Carbon-aware electricity',
    intro: 'Carbon intensity estimates how much carbon dioxide is associated with each unit of electricity used. It rises and falls with the electricity mix, demand, imports and weather.',
    shortAnswer: 'Carbon intensity is usually lower when wind, solar, nuclear and other low-carbon sources supply more of the grid, and higher when gas and other fossil generation provide a larger share. It is useful for timing flexible electricity use.',
    sections: [
      { heading: 'Carbon intensity right now', body: ['The live dashboard shows the latest available carbon-intensity estimate alongside demand and generation. Compare it with the generation mix to understand what is driving the number.'] },
      { heading: 'What is carbon intensity?', body: ['Carbon intensity is commonly expressed as grams of CO₂ per kilowatt-hour. A lower number means each unit of electricity consumed is associated with less carbon. It is an estimate rather than a physical label attached to each electron.'] },
      { heading: 'What counts as low, medium or high?', body: ['There is no single universal threshold, but lower-carbon periods tend to coincide with high wind, strong solar, steady nuclear and lower fossil generation. Higher-carbon periods often occur when demand is high and gas output rises.'] },
      { heading: 'Why carbon intensity changes', body: ['The main drivers are wind output, solar output, electricity demand, gas generation, nuclear availability and interconnector flows. Weather can shift the picture quickly: a windy night can be much cleaner than a still early evening peak.'] },
      { heading: 'How to use carbon intensity', body: ['Carbon intensity is most useful for flexible demand. If you can choose when to charge an EV, run a dishwasher, heat a water tank, charge a home battery or schedule business processes, lower-carbon windows can reduce emissions.'], bullets: ['Charge EVs during cleaner overnight or windy periods where practical.', 'Shift appliances away from high-demand evening peaks if convenient.', 'Use home batteries or smart tariffs alongside carbon-intensity signals.', 'For businesses, explore carbon-aware scheduling for flexible workloads.'] },
    ],
    faqs: [
      { question: 'Is low carbon intensity always cheaper?', answer: 'Not always. Carbon intensity and price often overlap through demand and renewable output, but tariffs, constraints and market conditions can differ.' },
      { question: 'Can I use carbon intensity for EV charging?', answer: 'Yes, if your charging time is flexible. Lower-carbon periods are often a better time to charge from an emissions perspective.' },
      { question: 'Why can imports affect carbon intensity?', answer: 'Imported electricity reflects conditions in neighbouring systems, so its carbon impact depends on where it comes from and what is generating there.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/cleanest-time-to-use-electricity', label: 'Cleanest time to use electricity' }, { to: '/renewables', label: 'Renewables' }, { to: '/uk-electricity-mix', label: 'UK electricity mix' }],
  },
  '/renewables': {
    slug: '/renewables',
    title: 'UK Renewable Electricity',
    metaTitle: 'UK Renewable Electricity Live | Wind, Solar, Hydro and Biomass',
    description: 'Live and plain-English guide to renewable electricity in Great Britain, including wind, solar, hydro, biomass, records, variability and carbon impact.',
    eyebrow: 'Renewable generation',
    intro: 'Renewable electricity is a major part of Britain’s grid, especially when wind output is strong or solar is producing through the middle of the day.',
    shortAnswer: 'Renewable share rises when wind, solar, hydro and biomass make up more of generation, and falls when demand is high or weather-dependent output is low. Wind is often the largest renewable driver in Great Britain.',
    sections: [
      { heading: 'Renewable share right now', body: ['The dashboard summarises the current renewable share using the live generation data available at the latest refresh. This helps show whether clean generation is carrying a large part of demand or whether flexible backup is doing more work.'] },
      { heading: 'Wind generation', body: ['Wind is the biggest swing factor in Britain’s renewable electricity mix. Strong wind can reduce gas generation and carbon intensity for long periods. Low-wind periods often require more gas, imports or other sources.'] },
      { heading: 'Solar generation', body: ['Solar output is highly time-of-day and season dependent. It is strongest around midday, especially in spring and summer, and drops quickly towards evening demand peaks.'] },
      { heading: 'Hydro and biomass', body: ['Hydro, pumped storage and biomass are smaller than wind and solar but still matter. Storage can respond quickly to system needs, while biomass is often treated separately because its carbon accounting is more complex than wind or solar.'] },
      { heading: 'Why renewable output changes', body: ['Renewables depend on weather, season, daylight and grid conditions. That variability is not a flaw in the data; it is the central reason dashboards like EnergyMix.info are useful.'] },
    ],
    faqs: [
      { question: 'What counts as renewable electricity?', answer: 'Usually wind, solar, hydro and sometimes biomass. EnergyMix.info labels categories carefully because sources and carbon accounting can vary.' },
      { question: 'Why is renewable share high at night sometimes?', answer: 'Wind can be very strong overnight while demand is lower, so renewables can cover a larger share of the grid.' },
      { question: 'Does high renewable output lower carbon intensity?', answer: 'Usually yes, especially when it reduces gas generation. The exact carbon intensity also depends on demand, imports and other sources.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/uk-electricity-mix', label: 'UK electricity mix' }, { to: '/methodology', label: 'Methodology' }],
  },
  '/cleanest-time-to-use-electricity': {
    slug: '/cleanest-time-to-use-electricity',
    title: 'Cleanest Time to Use Electricity',
    metaTitle: 'Cleanest Time to Use Electricity UK | EV Charging and Appliances',
    description: 'Learn when electricity is usually cleanest in Britain and how carbon intensity, wind, solar, demand and imports affect EV charging and flexible electricity use.',
    eyebrow: 'Practical grid timing',
    intro: 'The cleanest time to use electricity is the period when the grid has lower carbon intensity. That usually happens when low-carbon generation is high and demand is not forcing more fossil generation onto the system.',
    shortAnswer: 'There is no fixed cleanest hour every day. Windy overnight periods, sunny middays and lower-demand windows are often cleaner, while still evening peaks with more gas generation are often more carbon intensive.',
    sections: [
      { heading: 'Cleanest time today', body: ['Use EnergyMix.info’s live dashboard to compare current carbon intensity, renewables share, gas generation and demand. A future daily page can turn this into a simple cleanest-window recommendation once enough historical and forecast data is available.'] },
      { heading: 'What makes electricity cleaner?', body: ['Electricity is generally cleaner when more of the mix comes from wind, solar, nuclear, hydro and other low-carbon sources. It is generally more carbon intensive when gas or other fossil generation provides a larger share.'] },
      { heading: 'Best times for EV charging', body: ['If you can choose when to charge, overnight can be good when wind is strong and demand is lower. Solar-heavy midday periods can also be cleaner, especially in brighter months. Smart tariffs may add a price signal, but price and carbon are not identical.'] },
      { heading: 'Best times for appliances and batteries', body: ['Dishwashers, washing machines, immersion heaters and home batteries can often shift by a few hours. The practical rule is simple: avoid unnecessary use during high-demand, high-carbon peaks when a cleaner window is nearby and convenient.'] },
      { heading: 'How wind, solar, demand and imports affect the answer', body: ['Wind can make overnight electricity very clean. Solar can improve the middle of the day. Demand peaks can push gas higher. Imports can help or hurt depending on where they come from and what is generating in the exporting country.'] },
    ],
    faqs: [
      { question: 'Is overnight always the cleanest time?', answer: 'No. Overnight is often lower demand and can be clean when wind is strong, but a sunny midday or another windy period may be cleaner.' },
      { question: 'Should I always avoid evening electricity use?', answer: 'Not always. Some use is unavoidable. But flexible tasks can often move away from early evening peaks.' },
      { question: 'Is this the same as the cheapest time?', answer: 'No. Cheap periods and clean periods often overlap, especially with high renewables, but tariffs and market prices are separate signals.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/renewables', label: 'Renewables' }, { to: '/newsletter', label: 'Weekly briefing' }],
  },
};

const ExplainerPage = ({ page }: { page: Explainer }) => (
  <>
    <Helmet>
      <title>{page.metaTitle}</title>
      <meta name="description" content={page.description} />
      <link rel="canonical" href={`https://energymix.info${page.slug}`} />
      <meta property="og:title" content={page.metaTitle} />
      <meta property="og:description" content={page.description} />
      <meta property="og:url" content={`https://energymix.info${page.slug}`} />
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
        <h2 className="text-2xl font-semibold text-primary mb-3">Short answer</h2>
        <p>{page.shortAnswer}</p>
      </section>

      {page.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-2xl font-semibold text-primary mb-3">{section.heading}</h2>
          <div className="space-y-3">
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          {section.bullets && <ul className="mt-4 space-y-2 list-disc pl-5">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
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
        <ul className="grid md:grid-cols-2 gap-3">
          {page.related.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="block rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10 transition-colors">{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </StaticPageLayout>
  </>
);

export const UkElectricityMix = () => <ExplainerPage page={explainers['/uk-electricity-mix']} />;
export const CarbonIntensity = () => <ExplainerPage page={explainers['/carbon-intensity']} />;
export const Renewables = () => <ExplainerPage page={explainers['/renewables']} />;
export const CleanestTimeToUseElectricity = () => <ExplainerPage page={explainers['/cleanest-time-to-use-electricity']} />;
