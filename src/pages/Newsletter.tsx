import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Placeholder for newsletter signup
    toast({
      title: "Newsletter signup",
      description: "Newsletter integration coming soon. Thank you for your interest!",
    });
    setEmail('');
  };

  return (
    <>
      <Helmet>
        <title>Energy Mix Newsletter | Weekly UK Electricity Insights</title>
        <meta name="description" content="Join the free Energy Mix newsletter for quick, weekly insights into how the UK's energy mix is evolving — straight from live grid data." />
        <link rel="canonical" href="https://energymix.info/newsletter" />
        <meta property="og:title" content="Energy Mix Newsletter | Weekly UK Electricity Insights" />
        <meta property="og:description" content="Join the free Energy Mix newsletter for quick, weekly insights into how the UK's energy mix is evolving — straight from live grid data." />
        <meta property="og:url" content="https://energymix.info/newsletter" />
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
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Mail className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">Get Weekly Energy Mix Updates</h1>
              <p className="text-lg text-foreground/80 leading-relaxed">
                Stay informed with a short, data-driven summary every week — tracking how the UK's energy mix changes over time.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">What You'll Receive</h2>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Top three movements in generation and demand</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Snapshot of carbon intensity and renewables</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Insight links back to the live dashboard</span>
                </li>
              </ul>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">Join the List</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground/90">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  Subscribe Now
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-6 text-center">
                We respect your privacy. No spam — just clear, actionable energy data.
              </p>
            </div>
          </div>
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

export default Newsletter;
