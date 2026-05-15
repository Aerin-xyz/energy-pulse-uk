import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { StaticPageLayout } from '@/components/StaticPageLayout';
import generated from '@/data/energyMixGenerated.json';

const posts = generated.socialPosts;

const Social = () => (
  <>
    <Helmet>
      <title>Energy Mix LinkedIn Post Templates | Weekly Grid Briefs</title>
      <meta name="description" content="Ready-to-use LinkedIn post templates for EnergyMix.info weekly grid briefs, electricity explainers and clean-electricity updates." />
      <link rel="canonical" href="https://energymix.info/social/" />
      <meta property="og:title" content="Energy Mix LinkedIn Post Templates" />
      <meta property="og:description" content="Weekly LinkedIn distribution copy for EnergyMix.info reports and explainers." />
      <meta property="og:url" content="https://energymix.info/social/" />
      <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
      <meta name="robots" content="noindex, follow" />
    </Helmet>
    <StaticPageLayout eyebrow="Distribution" title="LinkedIn post templates" intro="A practical posting queue for turning EnergyMix.info reports and explainers into LinkedIn distribution. This page is useful operationally, but marked noindex so it does not compete with public report pages.">
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">This week’s posts</h2>
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.title} className="rounded-lg border border-primary/20 bg-background/40 p-5">
              <h3 className="text-xl font-semibold text-cosmic-cyan mb-3">{post.title}</h3>
              <pre className="whitespace-pre-wrap text-sm md:text-base font-sans leading-relaxed text-foreground/85">{post.body}</pre>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-3">Posting rhythm</h2>
        <ul className="space-y-2 list-disc pl-5">
          <li>Monday: weekly grid brief linking to the latest report.</li>
          <li>Wednesday: plain-English explainer linking to a topic page.</li>
          <li>Friday: live moment, record watch or practical clean-electricity post.</li>
        </ul>
        <p className="mt-4"><Link to="/reports" className="text-cosmic-cyan hover:underline">Use the reports archive</Link> as the source of truth for weekly posts.</p>
      </section>
    </StaticPageLayout>
  </>
);

export default Social;
