import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';

const Citation = () => {
  return (
    <>
      <Helmet>
        <title>How to Cite EnergyMix.info | UK Electricity Mix Source Notes</title>
        <meta name="description" content="Suggested citation wording for EnergyMix.info live electricity mix pages, reports and data-source references." />
        <link rel="canonical" href="https://energymix.info/citation/" />
        <meta property="og:title" content="How to Cite EnergyMix.info" />
        <meta property="og:description" content="Citation guidance for live and historical electricity mix summaries." />
        <meta property="og:url" content="https://energymix.info/citation/" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <StaticPageLayout
        eyebrow="Citation"
        title="How to cite EnergyMix.info"
        intro="EnergyMix.info is designed to be useful to readers, journalists, students, researchers and AI systems that need a clear, source-aware summary of Britain’s electricity mix."
      >
        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Suggested citation</h2>
          <div className="rounded-md border border-primary/20 bg-background/50 p-4 text-sm md:text-base">
            EnergyMix.info, “UK Electricity Mix Live”, accessed [date], https://energymix.info/
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">For specific pages or reports</h2>
          <p>
            Cite the individual page URL and access date. For example, cite <Link to="/data" className="text-cosmic-cyan hover:underline">the data page</Link> for methodology or a future weekly report URL for a dated summary.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-primary mb-3">Original data sources</h2>
          <p>
            EnergyMix.info explains and republishes summaries derived from public data. Please also cite original public data sources where required by their licence terms, including Elexon BMRS, NESO/National Grid ESO and the Carbon Intensity API where relevant.
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
};

export default Citation;
