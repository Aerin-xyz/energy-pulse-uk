import { Helmet } from "react-helmet-async";
import { EnergyDashboard } from "@/components/EnergyDashboard";
export default function Explore() {
  return (
    <>
      <Helmet>
        <title>Explore GB Electricity Data | Energy Mix</title>
        <link rel="canonical" href="https://energymix.info/explore/" />
      </Helmet>
      <EnergyDashboard />
    </>
  );
}
