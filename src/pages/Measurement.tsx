import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const Measurement = () => (
  <>
    <Helmet>
      <title>Energy Mix Measurement Plan | GA4, Search Console and SEO Tracking</title>
      <meta name="description" content="Operational measurement plan for EnergyMix.info: Search Console, GA4, LinkedIn referrals, newsletter conversions and weekly reporting checks." />
      <link rel="canonical" href="https://energymix.info/measurement" />
      <meta property="og:title" content="Energy Mix Measurement Plan" />
      <meta property="og:description" content="GA4, Search Console and SEO tracking plan for EnergyMix.info." />
      <meta property="og:url" content="https://energymix.info/measurement" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="noindex, follow" />
    </Helmet>
    <StaticPageLayout eyebrow="Measurement" title="Measurement plan" intro="A lightweight operating checklist for tracking whether EnergyMix.info is gaining search visibility, useful engagement and commercial option value.">
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Weekly checks</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Search Console: organic clicks, impressions, indexed pages and new query terms.</li>
          <li>GA4: active users, page views, returning users, top landing pages and SPA route views via the <code>virtual_page_view</code> dataLayer event.</li>
          <li>LinkedIn: referral sessions and post clicks to report/explainer pages.</li>
          <li>Newsletter: signup clicks, form submits and unsubscribe rate once campaigns begin.</li>
          <li>Technical: sitemap coverage, crawl errors, Core Web Vitals warnings and whether new glossary/partner pages are discovered without being prominent in the main nav.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Events to track next</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Newsletter signup click and successful subscribe.</li>
          <li>Outbound source clicks to Elexon, NESO and Carbon Intensity API.</li>
          <li>Report views and scroll depth.</li>
          <li>Virtual page views on client-side route changes, with <code>page_path</code>, <code>page_location</code> and <code>page_title</code>.</li>
          <li>API/widget waitlist interest from <code>/partners</code> and static-page CTAs.</li>
          <li>Sponsorship/contact CTA clicks.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Source-of-truth pages</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Link to="/reports" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Reports</Link>
          <Link to="/social" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">LinkedIn templates</Link>
          <Link to="/records" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Records</Link>
          <Link to="/newsletter" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Newsletter</Link>
          <Link to="/glossary" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Glossary</Link>
          <Link to="/partners" className="rounded-md border border-primary/20 p-3 text-cosmic-cyan hover:bg-primary/10">Widgets & data</Link>
        </div>
      </section>
    </StaticPageLayout>
  </>
);

export default Measurement;
