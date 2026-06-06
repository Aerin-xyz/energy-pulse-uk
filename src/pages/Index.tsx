import { EnergyDashboard } from '@/components/EnergyDashboard';
import { StaticGridSnapshot } from '@/components/StaticGridSnapshot';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>UK Electricity Mix Live | EnergyMix.info</title>
        <meta name="description" content="See Britain’s live electricity mix, demand, renewables, gas, imports, storage and carbon intensity in one plain-English dashboard." />
        <link rel="canonical" href="https://energymix.info/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="UK Electricity Mix Live | EnergyMix.info" />
        <meta property="og:description" content="See Britain’s live electricity mix, demand, renewables, gas, imports, storage and carbon intensity in one plain-English dashboard." />
        <meta property="og:url" content="https://energymix.info/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta property="og:site_name" content="EnergyMix.info" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="UK Electricity Mix Live | EnergyMix.info" />
        <meta name="twitter:description" content="See Britain’s live electricity mix, demand, renewables, gas, imports, storage and carbon intensity in one plain-English dashboard." />
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
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/today" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Today’s electricity mix</Link>
                <Link to="/uk-electricity-mix" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">What the mix means</Link>
                <Link to="/carbon-intensity" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">UK carbon intensity</Link>
                <Link to="/reports" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Weekly reports</Link>
                <Link to="/newsletter" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Newsletter</Link>
              </div>
            </div>
          </section>
        )}
      />
    </>
  );
};

export default Index;
