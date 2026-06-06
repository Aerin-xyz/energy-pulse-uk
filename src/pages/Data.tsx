import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';

const Data = () => {
  const primarySources = [
    {
      name: "Elexon BMRS",
      description: "Balancing Mechanism Reporting System data for national generation and demand",
      url: "https://bmrs.elexon.co.uk/"
    },
    {
      name: "National Grid ESO",
      description: "Live generation and interconnector flow data",
      url: "https://www.neso.energy/"
    },
    {
      name: "Carbon Intensity",
      description: "Official national and regional CO₂ estimates and forecasts",
      url: "https://carbonintensity.org.uk"
    },
    {
      name: "Sheffield Solar PV Live",
      description: "Embedded solar generation estimates for Great Britain",
      url: "https://www.solar.sheffield.ac.uk/pvlive/"
    },
    {
      name: "ENTSO-E Transparency Platform",
      description: "Cross-border interconnector flow context, with BMRS fallbacks where needed",
      url: "https://transparency.entsoe.eu/"
    }
  ];

  const dataAreas = [
    {
      area: 'Generation by fuel',
      source: 'Elexon BMRS/FUELINST and related public GB electricity feeds',
      usedFor: 'Live electricity mix, wind, gas, nuclear, hydro, biomass and other visible generation categories',
      limitation: 'Transmission and settlement feeds can lag, revise and treat embedded generation differently from other dashboards',
    },
    {
      area: 'Demand',
      source: 'NESO/Elexon public demand data where available',
      usedFor: 'Current GB demand context and daily/weekly summaries',
      limitation: 'Demand definitions can differ from total generation because imports, exports, storage and embedded sources are handled differently',
    },
    {
      area: 'Carbon intensity',
      source: 'Carbon Intensity API',
      usedFor: 'National, regional and postcode carbon-intensity estimates and forecasts',
      limitation: 'Carbon intensity is an estimate and forecast, not a physical meter reading for each unit of electricity',
    },
    {
      area: 'Solar',
      source: 'Embedded solar estimates including Sheffield Solar PV Live and NESO demand data where needed',
      usedFor: 'Solar generation context, daily summaries and validation backfill',
      limitation: 'Much UK solar is embedded/distribution-connected, so it is often estimated rather than directly visible in transmission generation feeds',
    },
    {
      area: 'Interconnectors',
      source: 'ENTSO-E, BMRS-derived and related public flow data',
      usedFor: 'Import/export context and neighbouring-system signals',
      limitation: 'Flow conventions, sign direction and carbon impact can vary by source and market context',
    },
  ];

  return (
    <>
      <Helmet>
        <title>UK Electricity Data Sources: Elexon, NESO, Carbon Intensity & PV Live</title>
        <meta name="description" content="How EnergyMix.info combines public electricity data sources to explain Britain’s live power mix, carbon intensity, solar estimates and grid trends." />
        <link rel="canonical" href="https://energymix.info/data/" />
        <meta property="og:title" content="UK Electricity Data Sources" />
        <meta property="og:description" content="How EnergyMix.info combines public electricity data sources to explain Britain’s live power mix, carbon intensity, solar estimates and grid trends." />
        <meta property="og:url" content="https://energymix.info/data/" />
        <meta property="og:image" content="https://energymix.info/og-data.jpg" />
        <meta property="og:site_name" content="Energy Mix" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="UK Electricity Data Sources" />
        <meta name="twitter:description" content="How EnergyMix.info combines public electricity data sources to explain Britain’s live power mix, carbon intensity, solar estimates and grid trends." />
        <meta name="twitter:image" content="https://energymix.info/og-data.jpg" />
        <meta name="author" content="Energy Mix" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://energymix.info/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Data Sources",
                "item": "https://energymix.info/data/"
              }
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": "EnergyMix.info UK Electricity Mix Data",
            "description": "Live and recent electricity mix, demand, interconnector and carbon-intensity summaries for Great Britain, based on public electricity data sources.",
            "url": "https://energymix.info/data/",
            "creator": { "@type": "Organization", "name": "EnergyMix.info", "url": "https://energymix.info/" },
            "spatialCoverage": { "@type": "Place", "name": "Great Britain" },
            "isAccessibleForFree": true,
            "keywords": ["Great Britain electricity mix", "Elexon BMRS", "FUELINST", "NESO", "Carbon Intensity API"]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What data sources does Energy Mix use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Energy Mix connects directly to open national datasets including Elexon BMRS/FUELINST for fast transmission generation and Balancing Mechanism data, National Grid ESO for embedded generation, ENTSO-E for interconnector flows, and the Carbon Intensity API for official CO₂ estimates."
                }
              },
              {
                "@type": "Question",
                "name": "How often is Energy Mix data updated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Energy Mix uses a multi-tier refresh system. Fast-changing generation is refreshed more often, while settlement-period, demand, interconnector and carbon-intensity sources update on their own upstream cadence."
                }
              },
              {
                "@type": "Question",
                "name": "What licenses cover the Energy Mix data?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Energy Mix uses data under open licenses: BMRS data is licensed under the Elexon Open Data License, NESO data is licensed under the NESO Open Licence based on the Open Government Licence v3.0, and carbon intensity forecasts are provided by NESO via the Carbon Intensity API."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none"></div>
        
        {/* Header */}
        <header className="border-b border-primary/20 glass-morphism relative">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <AnimatedLogo />
              <Link to="/" aria-label="Back to Dashboard">
                <Button variant="outline" size="sm" className="mr-1">
                  <Home className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 relative z-10">
          <article className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-glow">UK Electricity Data Sources</h1>
            
            <div className="glass-morphism rounded-lg p-8 mb-8 leading-relaxed">
              <p className="text-lg text-foreground/90">
                EnergyMix.info combines public electricity and carbon-intensity data sources to explain Britain’s live power mix in plain English. This page sets out what each source is used for, why figures can differ between dashboards, and where the important limitations are.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Live UK electricity mix</Link>
                <Link to="/uk-electricity-mix" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">How the mix is calculated</Link>
                <Link to="/reports" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Weekly electricity reports</Link>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">At a glance</h2>
              <p className="text-foreground/80 leading-relaxed mb-5">
                The dashboard blends fast live feeds with slower settlement-period and forecast sources. The goal is useful public grid context, not billing-grade metering or an official system-operator publication.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="py-3 pr-4 text-foreground">Data area</th>
                      <th className="py-3 pr-4 text-foreground">Source</th>
                      <th className="py-3 pr-4 text-foreground">Used for</th>
                      <th className="py-3 text-foreground">Limitation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/15">
                    {dataAreas.map((item) => (
                      <tr key={item.area}>
                        <th className="py-3 pr-4 align-top font-semibold">{item.area}</th>
                        <td className="py-3 pr-4 align-top text-foreground/75">{item.source}</td>
                        <td className="py-3 pr-4 align-top text-foreground/75">{item.usedFor}</td>
                        <td className="py-3 align-top text-foreground/75">{item.limitation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-primary">Primary Sources</h2>
              <div className="space-y-4">
                {primarySources.map((source, index) => (
                  <div key={index} className="border-l-2 border-primary/30 pl-4 py-2">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-foreground">{source.name}</h3>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cosmic-cyan hover:text-cosmic-cyan/80 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-foreground/70">{source.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Why numbers differ between dashboards</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  Electricity dashboards can be correct while showing different numbers. The usual reasons are coverage, timing and category treatment rather than one site being “right” and another being “wrong”.
                </p>
                <ul className="space-y-2 list-disc pl-5">
                  <li><strong>GB vs UK coverage:</strong> many live feeds cover Great Britain, while Northern Ireland uses a separate electricity market.</li>
                  <li><strong>Embedded generation:</strong> solar and some wind can sit outside transmission-connected generation feeds and may need estimates.</li>
                  <li><strong>Settlement timing:</strong> some values update around 30-minute settlement periods while others refresh more frequently.</li>
                  <li><strong>Imports, exports and storage:</strong> dashboards may show these separately, net them out, or include them in different totals.</li>
                  <li><strong>Rounding and revisions:</strong> public data can lag or be revised after the first live publication.</li>
                </ul>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Renewables and low-carbon definitions</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  Renewable electricity usually means wind, solar, hydro and sometimes biomass depending on the accounting convention. Low-carbon electricity is broader because it normally includes nuclear as well.
                </p>
                <p>
                  EnergyMix.info keeps these ideas separate where possible. Renewable share helps explain weather-led generation, while low-carbon share and carbon intensity help explain the emissions context.
                </p>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Update Frequency</h2>
              
              <p className="text-foreground/80 leading-relaxed mb-6">
                Energy Mix uses a multi-tier refresh system designed to feel live while staying gentle on public APIs. Fast-changing generation is polled more often; slower settlement-period data is refreshed on a steadier cadence.
              </p>
              
              <div className="space-y-4">
                <div className="border-l-2 border-green-500/30 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h3 className="font-semibold text-foreground">High Frequency — Every 2 minutes</h3>
                  </div>
                  <p className="text-sm text-foreground/70">
                    Transmission-connected generation from Elexon FUELINST's 5-minute feed, plus the latest embedded wind and solar estimates where available. This keeps the visible mix moving much closer to live.
                  </p>
                </div>
                
                <div className="border-l-2 border-blue-500/30 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="font-semibold text-foreground">Mid Frequency — Every 5 minutes</h3>
                  </div>
                  <p className="text-sm text-foreground/70">
                    Interconnector flows and European generation mix from ENTSO-E/BMRS fallbacks. These update frequently enough for live dashboard use without hammering the upstream services.
                  </p>
                </div>
                
                <div className="border-l-2 border-purple-500/30 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <h3 className="font-semibold text-foreground">Full Refresh — Every 10 minutes</h3>
                  </div>
                  <p className="text-sm text-foreground/70">
                    Complete data refresh including demand outturn, embedded sources, interconnectors, EU data, and carbon intensity forecasts. Settlement-period datasets still update at their native 30-minute cadence.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-primary/20">
                <p className="text-sm text-foreground/70 leading-relaxed">
                  Updates are staggered to prevent simultaneous API requests and reduce load on data providers. 
                  The dashboard also refreshes automatically when you return to the tab after being away.
                </p>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Data roadmap and known gaps</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  The live dashboard now covers the core electricity mix well. The next data improvements are about practical usefulness: price, storage, regional carbon and reusable access.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border-l-2 border-amber-400/40 pl-4 py-2">
                    <h3 className="font-semibold text-foreground mb-1">Wholesale price</h3>
                    <p className="text-sm text-foreground/70">Useful for “cleanest vs cheapest” guidance. EnergyMix now pulls Elexon Market Index Price as wholesale context; it is not a consumer tariff or smart-tariff recommendation.</p>
                  </div>
                  <div className="border-l-2 border-amber-400/40 pl-4 py-2">
                    <h3 className="font-semibold text-foreground mb-1">Storage and pumped storage</h3>
                    <p className="text-sm text-foreground/70">Pumped storage is now shown by state: charging/pumping when PS is negative, generating when PS is positive. This avoids hiding storage inside generation noise.</p>
                  </div>
                  <div className="border-l-2 border-cosmic-cyan/40 pl-4 py-2">
                    <h3 className="font-semibold text-foreground mb-1">Regional carbon</h3>
                    <p className="text-sm text-foreground/70">Regional and postcode carbon forecasts are now exposed on the carbon-intensity page using NESO’s Carbon Intensity API.</p>
                  </div>
                  <div className="border-l-2 border-cosmic-cyan/40 pl-4 py-2">
                    <h3 className="font-semibold text-foreground mb-1">API and embeds</h3>
                    <p className="text-sm text-foreground/70">A public widget/API surface is the next packaging opportunity: embeddable Power Flow, daily summary cards and lightweight JSON endpoints for partners.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">API, widget and embed interest</h2>
              <p className="text-foreground/80 leading-relaxed mb-4">
                EnergyMix.info is being shaped so the clearest parts can be reused elsewhere: a small Power Flow widget, clean-electricity timing cards, daily summary images and selected machine-readable data.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/power-flow">
                  <Button variant="outline" size="sm">View Power Flow</Button>
                </Link>
                <Link to="/newsletter">
                  <Button variant="outline" size="sm">Register interest</Button>
                </Link>
                <Link to="/partners">
                  <Button variant="outline" size="sm">Widgets and data access</Button>
                </Link>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Licenses & Attribution</h2>
              
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  This service uses data made available under open licenses. We are required to provide the following attributions:
                </p>
                
                <div className="border-l-2 border-primary/30 pl-4 py-2">
                  <h3 className="font-semibold text-foreground mb-2">Elexon BMRS Data</h3>
                  <p className="text-sm">
                    Contains BMRS data © Elexon Limited copyright and database right 2026. 
                    Licensed under the <a href="https://www.elexon.co.uk/about/insights-and-reports/bmrs/"
                    target="_blank" rel="noopener noreferrer" 
                    className="text-cosmic-cyan hover:underline">Elexon Open Data License</a>.
                  </p>
                </div>
                
                <div className="border-l-2 border-primary/30 pl-4 py-2">
                  <h3 className="font-semibold text-foreground mb-2">NESO Data</h3>
                  <p className="text-sm">
                    Contains data from the National Energy System Operator (NESO), licensed under the{' '}
                    <a href="https://www.neso.energy/data-portal/neso-open-licence" 
                    target="_blank" rel="noopener noreferrer" 
                    className="text-cosmic-cyan hover:underline">NESO Open Licence</a>, 
                    which is based on the Open Government Licence v3.0.
                  </p>
                </div>
                
                <div className="border-l-2 border-primary/30 pl-4 py-2">
                  <h3 className="font-semibold text-foreground mb-2">Carbon Intensity Data</h3>
                  <p className="text-sm">
                    Carbon intensity forecasts provided by the National Energy System Operator via the{' '}
                    <a href="https://carbonintensity.org.uk/" 
                    target="_blank" rel="noopener noreferrer" 
                    className="text-cosmic-cyan hover:underline">Carbon Intensity API</a>.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-6 mt-8">
              <h2 className="text-lg font-semibold mb-4 text-primary">Related Pages</h2>
              <div className="flex flex-wrap gap-4">
                <Link to="/">
                  <Button variant="outline" size="sm">Live Dashboard</Button>
                </Link>
                <Link to="/uk-electricity-mix">
                  <Button variant="outline" size="sm">UK Electricity Mix</Button>
                </Link>
                <Link to="/carbon-intensity">
                  <Button variant="outline" size="sm">Carbon Intensity</Button>
                </Link>
                <Link to="/today">
                  <Button variant="outline" size="sm">Today’s Mix</Button>
                </Link>
                <Link to="/reports">
                  <Button variant="outline" size="sm">Reports</Button>
                </Link>
                <Link to="/newsletter">
                  <Button variant="outline" size="sm">Weekly Newsletter</Button>
                </Link>
                <Link to="/partners">
                  <Button variant="outline" size="sm">Widgets & Data</Button>
                </Link>
              </div>
            </div>
          </article>
        </main>

        {/* Footer */}
        <footer className="border-t border-primary/20 glass-morphism mt-16 relative">
          <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
          <div className="container mx-auto px-4 py-6 relative z-10">
            <nav className="flex justify-center gap-6 mb-4">
              <Link to="/about" className="text-sm text-foreground/70 hover:text-primary transition-colors">About</Link>
              <Link to="/data" className="text-sm text-foreground/70 hover:text-primary transition-colors">Data</Link>
              <Link to="/insights" className="text-sm text-foreground/70 hover:text-primary transition-colors">Insights</Link>
              <Link to="/newsletter" className="text-sm text-foreground/70 hover:text-primary transition-colors">Newsletter</Link>
            </nav>
            <div className="text-xs text-foreground/50 text-center space-y-1">
              <p>Contains BMRS data © Elexon Limited copyright and database right 2026</p>
              <p>Data from National Energy System Operator (NESO) under the NESO Open Licence</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Data;
