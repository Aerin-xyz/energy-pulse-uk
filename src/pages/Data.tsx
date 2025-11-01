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
      description: "Official hourly CO₂ estimates",
      url: "https://carbonintensity.org.uk"
    }
  ];

  return (
    <>
      <Helmet>
        <title>UK Energy Mix Data Sources | Elexon BMRS · National Grid ESO</title>
        <meta name="description" content="Energy Mix draws live electricity data from Elexon BMRS, National Grid ESO and other verified open datasets to show the UK's real-time generation mix." />
        <link rel="canonical" href="https://energymix.info/data" />
        <meta property="og:title" content="UK Energy Mix Data Sources" />
        <meta property="og:description" content="Live datasets powering the UK Energy Mix dashboard — Elexon BMRS and National Grid ESO." />
        <meta property="og:url" content="https://energymix.info/data" />
        <meta property="og:image" content="https://energymix.info/og-data.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none"></div>
        
        {/* Header */}
        <header className="border-b border-primary/20 glass-morphism relative">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <AnimatedLogo />
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 relative z-10">
          <article className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-glow">Data Sources & Methodology</h1>
            
            <div className="glass-morphism rounded-lg p-8 mb-8 leading-relaxed">
              <p className="text-lg text-foreground/90">
                Energy Mix connects directly to open national datasets that track the UK's power system in real time.
              </p>
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
              <h2 className="text-2xl font-semibold mb-4 text-primary">Update Frequency</h2>
              <p className="text-foreground/80 leading-relaxed">
                Data refreshes automatically throughout the day.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Transparency</h2>
              <p className="text-foreground/80 leading-relaxed">
                All figures are drawn from public, machine-readable sources. We apply only light aggregation for readability — never editorial adjustments.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 text-primary">License</h2>
              <p className="text-foreground/80 leading-relaxed">
                Data is used under the Open Government License (OGL) and equivalent open-data terms.
              </p>
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
            <div className="text-xs text-foreground/50 text-center">
              Contains BMRS data © Elexon Limited copyright and database right 2025
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Data;
