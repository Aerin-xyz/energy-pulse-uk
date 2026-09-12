import { Helmet } from "react-helmet-async";
import { ElectricityObservatory } from "@/components/ElectricityObservatory";
import "@/styles/observatory.css";
export default function Index() {
  return (
    <>
      <Helmet>
        <title>Britain’s Electricity — Live, Explained | Energy Mix</title>
        <meta
          name="description"
          content="Explore Britain’s live electricity atlas: generation, interconnector flows, carbon forecasts and the stories behind the grid. Public data, clearly explained."
        />
        <link rel="canonical" href="https://energymix.info/" />
        <meta
          property="og:title"
          content="Britain’s electricity — live, explained"
        />
        <meta
          property="og:description"
          content="Follow the flows. Understand the changes. Explore Britain’s electricity atlas."
        />
        <meta property="og:url" content="https://energymix.info/" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://energymix.info/og-atlas.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Energy Mix",
            url: "https://energymix.info/",
            description: "Britain’s electricity — live, explained.",
          })}
        </script>
      </Helmet>
      <ElectricityObservatory />
    </>
  );
}
