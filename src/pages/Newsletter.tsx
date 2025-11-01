import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
            <p className="text-lg text-foreground/80">
              Join our newsletter for quick insights on the UK's energy generation trends direct to your inbox.
            </p>
          </div>

          <div className="glass-morphism rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                Subscribe to Newsletter
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-semibold mb-3 text-foreground/90">What you'll receive:</h3>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Weekly summaries of UK energy generation trends
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Analysis of renewable energy performance
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Grid insights and notable developments
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  No spam, unsubscribe anytime
                </li>
              </ul>
            </div>
          </div>
        </div>
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

export default Newsletter;
