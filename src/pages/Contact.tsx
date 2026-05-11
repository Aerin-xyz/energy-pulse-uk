import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact EnergyMix.info | Corrections, Press, Partnerships & Data</title>
        <meta name="description" content="Contact EnergyMix.info about data corrections, press enquiries, sponsorship, partnerships, API/widget interest and feedback." />
        <link rel="canonical" href="https://energymix.info/contact" />
        <meta property="og:title" content="Contact EnergyMix.info" />
        <meta property="og:description" content="Corrections, press, partnerships and data enquiries for EnergyMix.info." />
        <meta property="og:url" content="https://energymix.info/contact" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Contact"
        title="Contact EnergyMix.info"
        intro="Use this page for corrections, data questions, press enquiries, partnerships, sponsorship ideas and API or widget interest."
      >
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Corrections and data issues</h2>
          <p>
            If a data point, label or explanation looks wrong, please include the page URL, timestamp, what you expected to see and any source you are comparing against. Grid data can lag or be revised, so precise examples help.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Press and citation enquiries</h2>
          <p>
            Journalists, researchers and students can cite EnergyMix.info as a plain-English electricity mix reference. See <Link to="/citation" className="text-cosmic-cyan hover:underline">how to cite EnergyMix.info</Link> for suggested wording and source notes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Partnerships, sponsorship and data products</h2>
          <p>
            EnergyMix.info is exploring useful commercial options around weekly grid briefings, sponsorship, embeddable widgets, API access and carbon-aware electricity insights for households and businesses.
          </p>
          <p className="mt-3">
            For now, contact the site owner through the route that referred you here, or use the newsletter as the easiest way to stay close to new releases.
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Contact;
