import { EnergyDashboard } from '@/components/EnergyDashboard';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>UK Electricity Dashboard - Live Energy Mix Data | Energy Mix</title>
        <meta name="description" content="Real-time UK electricity generation dashboard tracking renewable energy, fossil fuels, carbon intensity, and grid demand. Live data from BMRS updated every 30 minutes." />
        <link rel="canonical" href="https://energymix.info/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="UK Electricity Dashboard - Live Energy Mix Data" />
        <meta property="og:description" content="Real-time UK electricity generation dashboard tracking renewable energy, fossil fuels, carbon intensity, and grid demand." />
        <meta property="og:url" content="https://energymix.info/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://energymix.info/og-default.jpg" />
        <meta property="og:site_name" content="Energy Mix" />
        <meta property="og:locale" content="en_GB" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="UK Electricity Dashboard - Live Energy Mix Data" />
        <meta name="twitter:description" content="Real-time UK electricity generation dashboard tracking renewable energy, fossil fuels, carbon intensity, and grid demand." />
        <meta name="twitter:image" content="https://energymix.info/og-default.jpg" />
        
        {/* Additional SEO */}
        <meta name="author" content="Energy Mix" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      
      <h1 className="sr-only">UK Electricity Dashboard - Live Energy Generation and Demand</h1>
      <EnergyDashboard />
    </>
  );
};

export default Index;
