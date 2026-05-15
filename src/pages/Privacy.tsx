import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>EnergyMix.info Privacy Policy | Analytics, Cookies & Newsletter</title>
        <meta name="description" content="Privacy information for EnergyMix.info, including Google Analytics, Google Tag Manager, Search Console and newsletter processing." />
        <link rel="canonical" href="https://energymix.info/privacy/" />
        <meta property="og:title" content="EnergyMix.info Privacy Policy" />
        <meta property="og:description" content="How EnergyMix.info uses analytics, cookies and newsletter services." />
        <meta property="og:url" content="https://energymix.info/privacy/" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Privacy"
        title="Privacy policy"
        intro="EnergyMix.info uses a small number of third-party services to understand site usage, maintain search visibility and run the newsletter."
      >
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Analytics and measurement</h2>
          <p>
            EnergyMix.info uses Google Analytics 4 and Google Tag Manager to understand aggregate site usage, such as page views, traffic sources and interaction patterns. This helps improve the dashboard, reports and explanatory pages.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Search Console</h2>
          <p>
            Google Search Console is used to monitor indexing, search queries, crawl issues and site health. It does not identify individual visitors to EnergyMix.info.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Newsletter</h2>
          <p>
            The newsletter form is provided by MailerLite. If you subscribe, your email address is processed by MailerLite so EnergyMix.info can send updates. You can unsubscribe using the link in any newsletter email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Cookies</h2>
          <p>
            Analytics, Tag Manager, newsletter and security services may set cookies or similar identifiers. Browser controls can be used to block or delete cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Contact</h2>
          <p>
            For privacy, correction or data questions, use the <Link to="/contact" className="text-cosmic-cyan hover:underline">contact page</Link> and include enough detail to identify the relevant issue.
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Privacy;
