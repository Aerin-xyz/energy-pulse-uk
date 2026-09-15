import { Helmet } from "react-helmet-async";
import { EnergyDashboard } from "@/components/EnergyDashboard";
export default function Explore() {
  return (
    <>
      <Helmet>
        <title>Explore GB Electricity Data | Energy Mix</title>
        <link rel="canonical" href="https://energymix.info/explore/" />
      </Helmet>
      <div className="site-explore-title"><p>LIVE DATA / EXPLORE</p><h1>Explore the electricity system.</h1><span>The charts, signals and controls behind the live grid.</span></div>
      <EnergyDashboard />
    </>
  );
}
