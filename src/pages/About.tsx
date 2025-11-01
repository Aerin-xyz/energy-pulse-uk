import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const About = () => {
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
        <article className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">About Energy Mix</h1>
          
          <div className="glass-morphism rounded-lg p-8 space-y-6 text-foreground/90">
            <p className="text-lg leading-relaxed">
              Energy Mix visualises real-time data from the UK's electricity grid. Built for clarity and transparency, it helps users explore how Britain generates and uses power.
            </p>
            
            <p className="leading-relaxed">
              Our dashboard provides live insights into electricity generation mix, interconnector flows, carbon intensity, and historical trends. We combine data from multiple authoritative sources to give you a comprehensive view of the UK energy landscape.
            </p>

            <div className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Our Mission</h2>
              <p className="leading-relaxed">
                To make UK energy data accessible, understandable, and actionable for everyone—from energy professionals to curious citizens interested in the transition to renewable power.
              </p>
            </div>

            <div className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-primary">Data Sources</h2>
              <p className="leading-relaxed">
                Our data comes from official UK energy infrastructure providers including Elexon BMRS (Balancing Mechanism Reporting Service), National Grid ESO (Electricity System Operator), and ENTSO-E for European interconnector data.
              </p>
              <Link to="/data" className="inline-block mt-4 text-primary hover:text-primary/80 underline">
                Learn more about our data sources →
              </Link>
            </div>
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

export default About;
