import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavigationBar } from '@/components/NavigationBar';

interface StaticPageLayoutProps {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}

const footerLinks = [
  { to: '/about', label: 'About' },
  { to: '/data', label: 'Data' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/citation', label: 'Citation' },
  { to: '/contact', label: 'Contact' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/newsletter', label: 'Newsletter' },
];

export const StaticPageLayout = ({ eyebrow, title, intro, children }: StaticPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none" />
      <NavigationBar />

      <main className="container mx-auto px-4 py-16 relative z-10">
        <article className="max-w-4xl mx-auto">
          {eyebrow && <p className="text-sm uppercase tracking-[0.24em] text-primary/80 mb-4">{eyebrow}</p>}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">{title}</h1>
          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 max-w-3xl">{intro}</p>
          <div className="glass-morphism rounded-lg p-6 md:p-8 space-y-8 text-foreground/90 leading-relaxed">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t border-primary/20 glass-morphism mt-16 relative">
        <div className="absolute inset-0 bg-gradient-glow opacity-20" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <nav className="flex justify-center gap-4 md:gap-6 mb-4 flex-wrap">
            {footerLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm text-foreground/70 hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="text-xs text-foreground/50 text-center">
            Contains BMRS data © Elexon Limited copyright and database right 2026
          </div>
        </div>
      </footer>
    </div>
  );
};
