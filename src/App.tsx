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
import Today from "./pages/Today";
import { ReportsIndex, WeeklyReport20260511 } from "./pages/Reports";
import DigestPreview from "./pages/DigestPreview";
import AdminSocialPosts from "./pages/AdminSocialPosts";
import ShareDailySummary from "./pages/ShareDailySummary";
import AdminDailySummary from "./pages/AdminDailySummary";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <EnergyDataProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/today" element={<Today />} />
            <Route path="/reports" element={<ReportsIndex />} />
            <Route path="/reports/weekly/2026-05-11" element={<WeeklyReport20260511 />} />
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
