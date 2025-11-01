import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Insights = () => {
  return (
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">Energy Insights</h1>
          
          <div className="glass-morphism rounded-lg p-8 mb-8">
            <p className="text-lg leading-relaxed text-foreground/90">
              Analysis of UK power generation, renewable energy trends, and grid dynamics.
            </p>
          </div>

          <div className="glass-morphism rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-6">
              Insights and analysis articles coming soon. We'll be sharing regular commentary on UK energy trends, renewable generation patterns, and grid developments.
            </p>
            <Link to="/newsletter">
              <Button>
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
          <div className="text-xs text-foreground/50 text-center">
            Contains BMRS data © Elexon Limited copyright and database right 2025
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Insights;
