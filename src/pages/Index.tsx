import { EnergyDashboard } from '@/components/EnergyDashboard';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>UK Electricity Mix Live | GB Grid Demand, Carbon Intensity & Renewables</title>
        <meta name="description" content="Live Great Britain electricity mix: demand, generation, renewables, gas, nuclear, imports and carbon intensity, updated from public grid data." />
        <link rel="canonical" href="https://energymix.info/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="UK Electricity Mix Live" />
        <meta property="og:description" content="Live Great Britain electricity mix, demand, renewables, gas, nuclear, imports and carbon intensity." />
        <meta property="og:url" content="https://energymix.info/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta property="og:site_name" content="Energy Mix" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="UK Electricity Mix Live" />
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
      <section className="bg-background border-b border-primary/20">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.24em] text-primary/80 mb-3">Live GB electricity intelligence</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-glow">UK electricity mix right now</h2>
            <div className="space-y-4 text-foreground/80 leading-relaxed text-base md:text-lg">
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
            <nav className="mt-6 flex flex-wrap gap-3" aria-label="Energy Mix explainers">
              <a href="/uk-electricity-mix" className="rounded-md border border-primary/30 px-3 py-2 text-sm text-cosmic-cyan hover:bg-primary/10">UK electricity mix</a>
              <a href="/carbon-intensity" className="rounded-md border border-primary/30 px-3 py-2 text-sm text-cosmic-cyan hover:bg-primary/10">Carbon intensity</a>
              <a href="/renewables" className="rounded-md border border-primary/30 px-3 py-2 text-sm text-cosmic-cyan hover:bg-primary/10">Renewables</a>
              <a href="/cleanest-time-to-use-electricity" className="rounded-md border border-primary/30 px-3 py-2 text-sm text-cosmic-cyan hover:bg-primary/10">Cleanest time to use electricity</a>
            </nav>
          </div>
        </div>
      </section>
      <EnergyDashboard />
    </>
  );
};

export default Index;
