import { Helmet } from "react-helmet-async";
import { ElectricityObservatory } from "@/components/ElectricityObservatory";
import "@/styles/observatory.css";
export default function Index() {
  return (
    <>
      <Helmet>
        <title>UK Electricity Mix Live | GB Generation Map & Sources | Energy Mix</title>
        <meta
          name="description"
          content="See Great Britain’s electricity generation by source, explore power stations and interconnectors, and check carbon forecasts. Dated Elexon and NESO evidence."
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
      </Helmet>
      <ElectricityObservatory />
    </>
  );
}
