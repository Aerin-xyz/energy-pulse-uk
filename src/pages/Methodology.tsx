import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const Methodology = () => {
  return (
    <>
      <Helmet>
        <title>Energy Mix Methodology | GB Electricity Data Sources & Limits</title>
        <meta name="description" content="How EnergyMix.info collects, refreshes and explains Great Britain electricity mix, demand, carbon intensity and interconnector data." />
        <link rel="canonical" href="https://energymix.info/methodology" />
        <meta property="og:title" content="Energy Mix Methodology" />
        <meta property="og:description" content="Data sources, update cadence, geographic coverage and known limitations for EnergyMix.info." />
        <meta property="og:url" content="https://energymix.info/methodology" />
        <meta property="og:image" content="https://energymix.info/og-data.jpg" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'EnergyMix.info UK Electricity Mix Data',
            description: 'Live and recent electricity mix, demand and carbon intensity summaries for Great Britain based on public electricity data sources.',
            url: 'https://energymix.info/methodology',
            creator: { '@type': 'Organization', name: 'EnergyMix.info', url: 'https://energymix.info/' },
            spatialCoverage: { '@type': 'Place', name: 'Great Britain' },
            isAccessibleForFree: true,
          })}
        </script>
      </Helmet>

      <StaticPageLayout
        eyebrow="Data transparency"
        title="Methodology"
        intro="EnergyMix.info explains Britain’s electricity system using public grid and carbon-intensity data. This page sets out what the dashboard covers, where the data comes from and the limitations to keep in mind."
      >
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Geographic coverage</h2>
          <p>
            Most live electricity-grid data covers Great Britain: England, Scotland and Wales. Northern Ireland is part of the UK but operates in a separate electricity market. EnergyMix.info uses “UK electricity mix” where that matches public search language, but clarifies the Great Britain coverage wherever precision matters.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Primary data sources</h2>
          <ul className="space-y-3 list-disc pl-5">
            <li><strong>Elexon BMRS / FUELINST:</strong> transmission-connected generation, balancing and related electricity market data.</li>
            <li><strong>NESO / National Grid ESO sources:</strong> grid demand, embedded generation context and system-level data where available.</li>
            <li><strong>Carbon Intensity API:</strong> official national, regional and postcode carbon-intensity estimates and forecasts for electricity consumption.</li>
            <li><strong>ENTSO-E and BMRS fallbacks:</strong> interconnector flow context where the dashboard can retrieve reliable data.</li>
            <li><strong>Sheffield Solar PV Live:</strong> embedded solar generation estimates used to avoid undercounting distributed solar.</li>
            <li><strong>Elexon Market Index Price:</strong> latest wholesale market index price, shown as grid-market context rather than a household tariff.</li>
            <li><strong>Elexon FREQ:</strong> GB system frequency, used as a simple grid-health signal around the 50 Hz target.</li>
          </ul>
          <p className="mt-4 text-sm text-foreground/70">
            For source links and licensing notes, see the <Link to="/data" className="text-cosmic-cyan hover:underline">data sources page</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Update frequency</h2>
          <p>
            Fast-changing generation data is refreshed more often than slower settlement-period or historical data. The live dashboard is designed to feel current while avoiding unnecessary load on public APIs. Individual charts and source freshness labels may show the latest available upstream timestamp.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Known limitations</h2>
          <ul className="space-y-3 list-disc pl-5">
            <li>Live data can lag the physical grid and may be revised after publication.</li>
            <li>Fuel categories can differ between source systems, especially storage, biomass, embedded generation and interconnectors.</li>
            <li>Storage and pumped storage are sign-sensitive: positive PS is shown as generation, negative PS as charging/pumping. EnergyMix surfaces the state separately instead of folding it into renewable output.</li>
            <li>Wholesale price is shown as market context only. It is not the same as a retail tariff, export tariff, Agile/Tracker price or final household cost.</li>
            <li>Interconnector imports and exports affect domestic generation mix and carbon intensity in different ways.</li>
            <li>Carbon intensity estimates are modelled and should be interpreted as best available public estimates, not exact metering.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">How percentages are calculated</h2>
          <p>
            Percentage shares are calculated from the generation values available to the dashboard at the time of refresh. Where imports, exports, storage or embedded generation are shown separately, explanatory labels are used to avoid implying false precision.
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Methodology;
