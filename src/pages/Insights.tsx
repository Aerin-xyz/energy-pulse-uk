import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';

const Insights = () => {
  return (
    <>
      <Helmet>
        <title>Energy Mix Insights | UK Grid Trends & Renewable Generation Analysis</title>
        <meta name="description" content="Brief explainers and insights from the Energy Mix dashboard — highlighting weekly trends in the UK's power generation and renewable transition." />
        <link rel="canonical" href="https://energymix.info/insights" />
        <meta property="og:title" content="Energy Mix Insights | UK Grid Trends & Renewable Generation Analysis" />
        <meta property="og:description" content="Brief explainers and insights from the Energy Mix dashboard — highlighting weekly trends in the UK's power generation and renewable transition." />
        <meta property="og:url" content="https://energymix.info/insights" />
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
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-glow">Energy Insights</h1>
            
            <div className="glass-morphism rounded-lg p-8 mb-8 leading-relaxed">
              <p className="text-lg text-foreground/90">
                Short explainers on what's changing in the UK's power system — drawn directly from the Energy Mix dashboard.
              </p>
              <p className="text-foreground/80 mt-4">
                Each post highlights notable shifts in supply, demand, and emissions intensity, turning live data into quick, visual takeaways.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-primary">Recent Topics</h2>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>When wind generation outpaces gas</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Interconnectors and cross-border balancing</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Daily carbon intensity patterns</span>
                </li>
              </ul>
            </div>

            <div className="glass-morphism rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-6">
                Subscribe below to receive weekly updates when new insights go live.
              </p>
              <Link to="/newsletter">
                <Button size="lg">
                  Subscribe to Updates
                </Button>
              </Link>
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

export default Insights;
