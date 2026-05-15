import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import { LiveSeoModule } from '@/components/LiveSeoModule';
import { RegionalCarbonPanel } from '@/components/RegionalCarbonPanel';

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
  liveFocus: 'mix' | 'carbon' | 'renewables' | 'gas' | 'nuclear' | 'interconnectors' | 'demand' | 'generation' | 'cleanest';
  showRegionalCarbon?: boolean;
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
    liveFocus: 'mix',
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
    liveFocus: 'carbon',
    showRegionalCarbon: true,
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
    liveFocus: 'renewables',
  },
  '/gas-generation': {
    slug: '/gas-generation',
    title: 'UK Gas Generation',
    metaTitle: 'UK Gas Power Generation Live | Why Gas Is High Today',
    description: 'Plain-English guide to gas power generation in Great Britain: why gas rises, how it backs up wind and solar, and what it means for carbon intensity.',
    eyebrow: 'Flexible generation',
    intro: 'Gas generation is the flexible part of Britain’s electricity system. It often rises when demand is high, wind is low, solar has faded or imports are not covering the gap.',
    shortAnswer: 'Gas plants can ramp up and down more easily than many other sources, so they often provide backup during still, dark or high-demand periods. When gas share rises, carbon intensity usually rises too.',
    sections: [
      { heading: 'Gas generation right now', body: ['Use the live dashboard to see current gas output alongside demand, wind, solar, imports and carbon intensity. Gas is most useful to interpret in context: a high gas number usually means something else is low, demand is high, or both.'] },
      { heading: 'Why gas plants run', body: ['Gas plants are dispatchable, meaning they can respond to system needs. They help cover evening peaks, low renewable periods, unexpected outages and times when imports are less available or less economic.'] },
      { heading: 'Wind and gas relationship', body: ['Wind is often the biggest swing factor. When wind output is strong, gas generation can fall sharply. When wind drops across Britain and nearby systems, gas often picks up the slack.'] },
      { heading: 'Demand peaks', body: ['Early evening demand peaks are a common reason gas rises. Solar is falling, people are home, lighting and cooking demand increase, and flexible generation becomes more valuable.'] },
      { heading: 'Carbon impact', body: ['Gas is less carbon intensive than coal, but far higher than wind, solar, nuclear or hydro. That means gas-heavy periods are usually higher-carbon electricity periods.'] },
    ],
    faqs: [
      { question: 'Why is gas generation high today?', answer: 'Usually because demand is high, wind or solar is low, imports are limited, or other generation is unavailable.' },
      { question: 'Is gas always bad for the grid?', answer: 'Gas provides flexibility and reliability, but it increases carbon intensity compared with low-carbon sources.' },
      { question: 'Does more wind reduce gas?', answer: 'Often yes. Strong wind output can displace gas generation and lower carbon intensity.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/renewables', label: 'Renewables' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/electricity-demand', label: 'Electricity demand' }],
    liveFocus: 'gas',
  },
  '/nuclear-power': {
    slug: '/nuclear-power',
    title: 'UK Nuclear Power',
    metaTitle: 'UK Nuclear Power Today | Live Nuclear Electricity Share',
    description: 'Guide to nuclear power in Britain’s electricity mix: live output, low-carbon baseload, outages and how nuclear differs from wind and solar.',
    eyebrow: 'Low-carbon generation',
    intro: 'Nuclear power is one of Britain’s steadier low-carbon electricity sources. It does not move with the weather in the same way as wind and solar, but output can change during outages and maintenance.',
    shortAnswer: 'Nuclear generation usually provides a stable low-carbon foundation for the grid. Its share rises or falls depending on plant availability, demand and how much wind, solar, gas and imports are generating at the same time.',
    sections: [
      { heading: 'Nuclear output right now', body: ['The live dashboard shows nuclear as part of the current generation mix. Nuclear output tends to move less dramatically than wind, solar or gas over a normal day.'] },
      { heading: 'Why nuclear is steadier', body: ['Nuclear stations are designed to run continuously for long periods. They are not usually used as fast flexible backup in the same way as gas, batteries or pumped storage.'] },
      { heading: 'Planned outages', body: ['Nuclear output can fall during refuelling, maintenance or unplanned outages. During lower nuclear availability, other sources must cover more of demand.'] },
      { heading: 'Role in low-carbon electricity', body: ['Because nuclear generation has low operational carbon emissions, higher nuclear availability can help keep carbon intensity lower, especially when renewable output is modest.'] },
    ],
    faqs: [
      { question: 'Is nuclear counted as renewable?', answer: 'No. Nuclear is low-carbon but not normally classified as renewable.' },
      { question: 'Why does nuclear output not change much?', answer: 'Nuclear plants are generally run steadily rather than ramping up and down to follow short-term demand.' },
      { question: 'Does nuclear lower carbon intensity?', answer: 'Yes, higher nuclear output usually helps lower grid carbon intensity compared with fossil generation.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/uk-electricity-mix', label: 'UK electricity mix' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/renewables', label: 'Renewables' }],
    liveFocus: 'nuclear',
  },
  '/interconnectors': {
    slug: '/interconnectors',
    title: 'UK Electricity Interconnectors',
    metaTitle: 'UK Electricity Imports and Exports Live | Interconnector Flows',
    description: 'Explain Britain’s electricity interconnectors, imports, exports, country flows and carbon impact in plain English.',
    eyebrow: 'Imports and exports',
    intro: 'Interconnectors are high-voltage links that move electricity between Britain and neighbouring countries. They can import power into Britain or export British power abroad.',
    shortAnswer: 'Britain imports when neighbouring electricity is useful, available or cheaper, and exports when Britain has surplus or market conditions favour sending power out. The carbon impact depends on what is generating on each side of the link.',
    sections: [
      { heading: 'Imports and exports right now', body: ['The live dashboard shows interconnector flows where data is available. Positive and negative flows indicate whether Britain is importing from or exporting to linked markets.'] },
      { heading: 'What interconnectors are', body: ['Interconnectors connect Britain to electricity markets such as France, Norway, Belgium, the Netherlands, Ireland and Denmark. They help balance systems across borders.'] },
      { heading: 'Why Britain imports electricity', body: ['Imports can help when British demand is high, domestic generation is constrained, neighbouring power is cheaper, or low-carbon electricity is available abroad.'] },
      { heading: 'Why Britain exports electricity', body: ['Exports can happen when Britain has strong renewable output, lower domestic demand, or market prices that favour sending electricity to another country.'] },
      { heading: 'Carbon impact', body: ['Imports are not automatically clean or dirty. Their carbon impact depends on the exporting country’s live generation mix and the wider market context.'] },
    ],
    faqs: [
      { question: 'Does imported electricity count in the UK electricity mix?', answer: 'It affects electricity consumption and balancing, but generation-mix charts may show imports separately from domestic generation.' },
      { question: 'Can Britain export renewable electricity?', answer: 'Yes. During strong renewable periods and favourable market conditions, Britain can export electricity.' },
      { question: 'Are imports always lower carbon?', answer: 'No. It depends on the exporting system’s generation mix at that time.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/uk-electricity-mix', label: 'UK electricity mix' }, { to: '/carbon-intensity', label: 'Carbon intensity' }, { to: '/methodology', label: 'Methodology' }],
    liveFocus: 'interconnectors',
  },
  '/electricity-demand': {
    slug: '/electricity-demand',
    title: 'UK Electricity Demand',
    metaTitle: 'UK Electricity Demand Live | GB Grid Demand Today',
    description: 'Track and understand Great Britain electricity demand, daily demand curves, evening peaks, seasonal changes and carbon-intensity impact.',
    eyebrow: 'Grid demand',
    intro: 'Electricity demand is how much power homes, businesses and industry need at a given moment. It shapes which generators run and how carbon intensive the grid becomes.',
    shortAnswer: 'Demand usually rises in the morning, peaks in the early evening and changes with weather, daylight, weekday patterns and season. High demand often requires more flexible generation.',
    sections: [
      { heading: 'Demand right now', body: ['EnergyMix.info shows live demand alongside generation and interconnector flows so you can see whether the system is tight, quiet, clean or gas-heavy.'] },
      { heading: 'Daily demand curve', body: ['A typical day has a morning rise, a daytime plateau or dip, and an early evening peak. Solar can reduce grid demand during daylight hours, while winter evenings can be especially demanding.'] },
      { heading: 'Peak demand', body: ['Peak demand matters because the grid must have enough available generation and imports to meet it. Flexible sources such as gas, storage and interconnectors often become more important at peaks.'] },
      { heading: 'Seasonal changes', body: ['Demand is usually higher in colder, darker months because of heating, lighting and longer evening peaks. Heatwaves can also change demand through cooling and industrial patterns.'] },
      { heading: 'Demand and carbon intensity', body: ['Higher demand does not automatically mean higher carbon intensity, but it often increases the chance that fossil generation is needed if low-carbon output is not enough.'] },
    ],
    faqs: [
      { question: 'When is electricity demand highest?', answer: 'Often during early evening, especially in colder months when people are home and solar output has faded.' },
      { question: 'Why does demand matter for carbon intensity?', answer: 'If extra demand is met by gas or other fossil generation, carbon intensity rises.' },
      { question: 'Can shifting demand help?', answer: 'Yes. Moving flexible use to cleaner, lower-demand periods can reduce emissions and sometimes cost.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/cleanest-time-to-use-electricity', label: 'Cleanest time' }, { to: '/gas-generation', label: 'Gas generation' }, { to: '/carbon-intensity', label: 'Carbon intensity' }],
    liveFocus: 'demand',
  },
  '/uk-electricity-generation-live': {
    slug: '/uk-electricity-generation-live',
    title: 'UK Electricity Generation Live',
    metaTitle: 'UK Electricity Generation Live | GB Grid Dashboard by Source',
    description: 'Live Great Britain electricity generation by source, including wind, solar, gas, nuclear, hydro, biomass, storage and interconnectors.',
    eyebrow: 'Live generation dashboard',
    intro: 'This page is for people looking specifically for live electricity generation by source rather than a broad energy-mix explainer.',
    shortAnswer: 'EnergyMix.info tracks live Great Britain electricity generation by source and explains what the numbers mean in plain English. It complements the main dashboard with a search-focused generation page.',
    sections: [
      { heading: 'Live generation by source', body: ['The dashboard shows the latest available generation mix across major fuel categories, including wind, solar, gas, nuclear, hydro, biomass and other sources.'] },
      { heading: 'Generation vs demand', body: ['Generation and demand are related but not identical in a live dashboard. Storage, imports, exports and measurement conventions can create differences between headline figures.'] },
      { heading: 'Why sources change', body: ['Wind and solar follow weather and daylight. Gas responds flexibly. Nuclear is steadier. Interconnectors reflect cross-border market and system conditions.'] },
      { heading: 'Source freshness', body: ['Live electricity data can arrive at different cadences depending on the source. EnergyMix.info uses freshness labels and methodology notes to avoid false precision.'] },
    ],
    faqs: [
      { question: 'Is this National Grid live data?', answer: 'EnergyMix.info uses public electricity datasets including Elexon BMRS/FUELINST, NESO-related sources and carbon-intensity data where available.' },
      { question: 'Why do totals differ between sites?', answer: 'Sites may group embedded generation, storage, imports or settlement-period data differently.' },
      { question: 'Does this include Northern Ireland?', answer: 'Most live data here covers Great Britain, not Northern Ireland’s separate electricity market.' },
    ],
    related: [{ to: '/', label: 'Live dashboard' }, { to: '/uk-electricity-mix', label: 'UK electricity mix' }, { to: '/electricity-demand', label: 'Electricity demand' }, { to: '/methodology', label: 'Methodology' }],
    liveFocus: 'generation',
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
      { heading: 'Cleanest time today', body: ['Use the live module above for the next low-carbon forecast window, then compare it with current renewables, gas generation and demand. The recommendation is emissions-focused: price and smart-tariff windows may differ.'] },
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
    liveFocus: 'cleanest',
  },
};

const canonicalPath = (slug: string) => slug === '/uk-electricity-mix' ? slug : `${slug}/`;

const ExplainerPage = ({ page }: { page: Explainer }) => (
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
        <h2 className="text-2xl font-semibold text-primary mb-3">Short answer</h2>
        <p>{page.shortAnswer}</p>
      </section>

      <LiveSeoModule focus={page.liveFocus} />

      {page.showRegionalCarbon && <RegionalCarbonPanel />}

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
export const GasGeneration = () => <ExplainerPage page={explainers['/gas-generation']} />;
export const NuclearPower = () => <ExplainerPage page={explainers['/nuclear-power']} />;
export const Interconnectors = () => <ExplainerPage page={explainers['/interconnectors']} />;
export const ElectricityDemand = () => <ExplainerPage page={explainers['/electricity-demand']} />;
export const UkElectricityGenerationLive = () => <ExplainerPage page={explainers['/uk-electricity-generation-live']} />;
export const CleanestTimeToUseElectricity = () => <ExplainerPage page={explainers['/cleanest-time-to-use-electricity']} />;
