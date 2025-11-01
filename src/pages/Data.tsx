import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Data = () => {
  const dataSources = [
    {
      name: "Elexon BMRS",
      description: "Balancing Mechanism Reporting Service - primary source for UK generation data",
      url: "https://www.bmreports.com",
      dataPoints: ["Generation by fuel type", "System demand", "Settlement periods"]
    },
    {
      name: "National Grid ESO",
      description: "Electricity System Operator - embedded generation and system status",
      url: "https://www.nationalgrideso.com",
      dataPoints: ["Embedded wind", "Embedded solar", "System frequency"]
    },
    {
      name: "ENTSO-E",
      description: "European Network of Transmission System Operators for Electricity",
      url: "https://www.entsoe.eu",
      dataPoints: ["Interconnector flows", "Cross-border capacity", "European generation data"]
    }
  ];

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
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">Data Sources</h1>
          
          <div className="glass-morphism rounded-lg p-8 mb-8">
            <p className="text-lg leading-relaxed text-foreground/90">
              Energy Mix sources live data from Elexon BMRS, National Grid ESO, and other open UK energy datasets. Our platform aggregates real-time information to provide comprehensive insights into the UK electricity system.
            </p>
          </div>

          <div className="space-y-6">
            {dataSources.map((source, index) => (
              <div key={index} className="glass-morphism rounded-lg p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-2xl font-semibold text-primary">{source.name}</h2>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cosmic-cyan hover:text-cosmic-cyan/80 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
                <p className="text-foreground/80 mb-4">{source.description}</p>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Data Points:</h3>
                  <ul className="list-disc list-inside space-y-1 text-foreground/70">
                    {source.dataPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-morphism rounded-lg p-8 mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-primary">Update Frequency</h2>
            <p className="text-foreground/80 mb-4">
              Our data is updated every 5 minutes to reflect the latest settlement period information from BMRS. Historical data is refreshed hourly to provide comprehensive trends and analysis.
            </p>
            <Link to="/">
              <Button className="mt-4">
                View Live Dashboard
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

export default Data;
