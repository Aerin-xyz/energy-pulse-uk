import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnergyDataProvider } from "@/contexts/EnergyDataContext";
import { HelmetProvider } from 'react-helmet-async';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Data from "./pages/Data";
import Insights from "./pages/Insights";
import Newsletter from "./pages/Newsletter";
import Methodology from "./pages/Methodology";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Citation from "./pages/Citation";
import { UkElectricityMix, CarbonIntensity, Renewables, GasGeneration, NuclearPower, Interconnectors, ElectricityDemand, UkElectricityGenerationLive, CleanestTimeToUseElectricity } from "./pages/CoreExplainers";
import { UkWindPowerToday, UkSolarPowerToday, GasShareOfElectricity, RenewablesShareToday, CarbonIntensityToday } from "./pages/GridInsightPages";
import Today from "./pages/Today";
import Yesterday from "./pages/Yesterday";
import PowerFlow from "./pages/PowerFlow";
import { ReportsIndex, WeeklyReportPage } from "./pages/Reports";
import { RecordsIndex, HighestRenewableShare, HighestWindGeneration, HighestSolarGeneration, HighestGasGeneration } from "./pages/Records";
import Social from "./pages/Social";
import Measurement from "./pages/Measurement";
import Glossary from "./pages/Glossary";
import Partners from "./pages/Partners";
import DigestPreview from "./pages/DigestPreview";
import AdminSocialPosts from "./pages/AdminSocialPosts";
import ShareDailySummary from "./pages/ShareDailySummary";
import AdminDailySummary from "./pages/AdminDailySummary";
import { RouteAnalytics } from "./components/RouteAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EnergyDataProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteAnalytics />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/data" element={<Data />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/citation" element={<Citation />} />
            <Route path="/uk-electricity-mix" element={<UkElectricityMix />} />
            <Route path="/carbon-intensity" element={<CarbonIntensity />} />
            <Route path="/renewables" element={<Renewables />} />
            <Route path="/gas-generation" element={<GasGeneration />} />
            <Route path="/nuclear-power" element={<NuclearPower />} />
            <Route path="/interconnectors" element={<Interconnectors />} />
            <Route path="/electricity-demand" element={<ElectricityDemand />} />
            <Route path="/uk-electricity-generation-live" element={<UkElectricityGenerationLive />} />
            <Route path="/cleanest-time-to-use-electricity" element={<CleanestTimeToUseElectricity />} />
            <Route path="/uk-wind-power-today" element={<UkWindPowerToday />} />
            <Route path="/uk-solar-power-today" element={<UkSolarPowerToday />} />
            <Route path="/gas-share-of-electricity" element={<GasShareOfElectricity />} />
            <Route path="/renewables-share-today" element={<RenewablesShareToday />} />
            <Route path="/carbon-intensity-today" element={<CarbonIntensityToday />} />
            <Route path="/today" element={<Today />} />
            <Route path="/yesterday" element={<Yesterday />} />
            <Route path="/power-flow" element={<PowerFlow />} />
            <Route path="/reports" element={<ReportsIndex />} />
            <Route path="/reports/weekly/:date" element={<WeeklyReportPage />} />
            <Route path="/records" element={<RecordsIndex />} />
            <Route path="/records/highest-renewable-share" element={<HighestRenewableShare />} />
            <Route path="/records/highest-wind-generation" element={<HighestWindGeneration />} />
            <Route path="/records/highest-solar-generation" element={<HighestSolarGeneration />} />
            <Route path="/records/highest-gas-generation" element={<HighestGasGeneration />} />
            <Route path="/social" element={<Social />} />
            <Route path="/measurement" element={<Measurement />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/share/daily-summary" element={<ShareDailySummary />} />
            <Route path="/admin/digest-preview" element={<DigestPreview />} />
            <Route path="/admin/social-posts" element={<AdminSocialPosts />} />
            <Route path="/admin/daily-summary" element={<AdminDailySummary />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EnergyDataProvider>
    </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
