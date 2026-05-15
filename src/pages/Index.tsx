import { EnergyDashboard } from '@/components/EnergyDashboard';
import { StaticGridSnapshot } from '@/components/StaticGridSnapshot';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>EnergyMix.info | UK Electricity Dashboard</title>
        <meta name="description" content="Live Great Britain electricity mix: demand, generation, renewables, gas, nuclear, imports and carbon intensity, updated from public grid data." />
        <link rel="canonical" href="https://energymix.info/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="EnergyMix.info | UK Electricity Dashboard" />
        <meta property="og:description" content="Live Great Britain electricity mix, demand, renewables, gas, nuclear, imports and carbon intensity." />
        <meta property="og:url" content="https://energymix.info/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta property="og:site_name" content="EnergyMix.info" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="EnergyMix.info | UK Electricity Dashboard" />
        <meta name="twitter:description" content="Live Great Britain electricity mix, demand, renewables, gas, nuclear, imports and carbon intensity." />
        <meta name="twitter:image" content="https://energymix.info/og-default.jpg" />
        
        {/* Additional SEO */}
        <meta name="author" content="Energy Mix" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'EnergyMix.info',
            url: 'https://energymix.info/',
            description: 'Live Great Britain electricity mix, demand, carbon intensity and renewable generation data.',
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'EnergyMix.info',
            url: 'https://energymix.info/',
          })}
        </script>
      </Helmet>
      
      <h1 className="sr-only">UK Electricity Mix Live - Great Britain Generation, Demand and Carbon Intensity</h1>
      <EnergyDashboard
        belowContent={(
          <section className="container mx-auto px-4 py-12 md:py-16 space-y-6" aria-labelledby="about-uk-electricity-mix">
            <div className="max-w-5xl">
              <StaticGridSnapshot />
            </div>
            <div className="max-w-4xl rounded-2xl border border-primary/20 bg-card/50 p-5 md:p-8 shadow-lg shadow-primary/5">
              <p className="mb-3 text-sm uppercase tracking-[0.24em] text-primary/80">Live GB electricity intelligence</p>
              <h2 id="about-uk-electricity-mix" className="mb-4 text-2xl md:text-3xl font-bold text-glow">About the UK electricity mix</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  EnergyMix.info shows Great Britain’s live electricity mix, including demand, wind, solar, gas, nuclear, imports, storage, hydro, biomass and carbon intensity.
                </p>
                <p>
                  Most live grid data covers Great Britain’s electricity system: England, Scotland and Wales. Northern Ireland is part of the UK but operates in a separate electricity market.
                </p>
                <p>
                  The dashboard updates from public electricity and carbon-intensity data sources and explains how clean the grid is now, what changed today, and what it means for homes, EV charging and businesses.
                </p>
              </div>
            </div>
          </section>
        )}
      />
    </>
  );
};

export default Index;
