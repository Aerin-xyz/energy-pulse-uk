import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';

const About = () => {
  return (
    <>
      <Helmet>
        <title>UK Energy Mix 2025 | About Our Live Electricity Dashboard</title>
        <meta name="description" content="Energy Mix makes the UK's electricity system transparent — showing how power is generated and used in real time across renewables, gas and imports." />
        <link rel="canonical" href="https://energymix.info/about" />
        <meta property="og:title" content="About Energy Mix | Making the Energy Transition Visible" />
        <meta property="og:description" content="Energy Mix visualises real-time UK electricity data from National Grid ESO & Elexon BMRS." />
        <meta property="og:url" content="https://energymix.info/about" />
        <meta property="og:image" content="https://energymix.info/og-about.jpg" />
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
          <article className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-glow">About Energy Mix</h1>
            
            <div className="glass-morphism rounded-lg p-8 space-y-6 text-foreground/90 leading-relaxed">
              <p className="text-lg">
                Energy Mix is an independent, data-driven project that visualises how the UK generates and uses electricity — moment by moment.
              </p>
              
              <p>
                Our aim is simple: to make the energy transition visible. By combining open datasets from National Grid ESO, Elexon BMRS, and other public sources, Energy Mix offers a clear picture of where our power comes from and how it's changing.
              </p>

              <p>
                Built for transparency and usability, the dashboard helps policymakers, businesses, and individuals understand the UK's shifting energy landscape.
              </p>

              <div className="pt-6 flex gap-4 flex-wrap">
                <Link to="/data">
                  <Button variant="outline">
                    View Data Sources
                  </Button>
                </Link>
                <Link to="/insights">
                  <Button variant="outline">
                    Read Insights
                  </Button>
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
            <div className="text-xs text-foreground/50 text-center">
              Contains BMRS data © Elexon Limited copyright and database right 2025
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default About;
