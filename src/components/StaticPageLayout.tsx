import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NavigationBar } from '@/components/NavigationBar';
import { TrackedLink } from '@/components/TrackedLink';
import { NewsletterCta } from '@/components/NewsletterCta';

interface StaticPageLayoutProps {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export const StaticPageLayout = ({ eyebrow, title, intro, children }: StaticPageLayoutProps) => {
  return (
    <div className="static-page-layout min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none" />
      <NavigationBar />

      <main className="container mx-auto px-4 py-16 relative z-10">
        <article className="max-w-4xl mx-auto">
          {eyebrow && <p className="text-sm uppercase tracking-[0.24em] text-primary/80 mb-4">{eyebrow}</p>}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">{title}</h1>
          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 max-w-3xl">{intro}</p>
          <div className="site-article-body rounded-lg space-y-8 text-foreground/90 leading-relaxed">
            {children}
            <NewsletterCta label="static_page_cta" />
            <section className="rounded-lg border border-primary/20 bg-background/40 p-5">
              <h2 className="text-2xl font-semibold text-primary mb-3">Need this for a site or product?</h2>
              <p>EnergyMix.info is also testing lightweight publisher widgets and selected data access for partners.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <TrackedLink to="/partners" eventName="api_widget_waitlist_click" eventLabel="static_page_partner_cta" className="rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">API/widget interest</TrackedLink>
              </div>
            </section>
          </div>
        </article>
      </main>


    </div>
  );
};
