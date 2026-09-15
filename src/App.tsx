import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EnergyDataProvider } from "@/contexts/EnergyDataContext";
import { HelmetProvider } from 'react-helmet-async';
import "./styles/observatory.css";
import Index from "./pages/Index";
const Explore = lazy(() => import("./pages/Explore"));
const GridSignalPage = lazy(() => import("./pages/GridSignalPage").then(m => ({default:m.GridSignalPage})));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Data = lazy(() => import("./pages/Data"));
const Insights = lazy(() => import("./pages/Insights"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const Methodology = lazy(() => import("./pages/Methodology"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Citation = lazy(() => import("./pages/Citation"));
const UkElectricityMix = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.UkElectricityMix})));
const CarbonIntensity = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.CarbonIntensity})));
const Renewables = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.Renewables})));
const GasGeneration = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.GasGeneration})));
const NuclearPower = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.NuclearPower})));
const Interconnectors = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.Interconnectors})));
const ElectricityDemand = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.ElectricityDemand})));
const UkElectricityGenerationLive = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.UkElectricityGenerationLive})));
const CleanestTimeToUseElectricity = lazy(() => import("./pages/CoreExplainers").then(m => ({default:m.CleanestTimeToUseElectricity})));
const UkWindPowerToday = lazy(() => import("./pages/GridInsightPages").then(m => ({default:m.UkWindPowerToday})));
const UkSolarPowerToday = lazy(() => import("./pages/GridInsightPages").then(m => ({default:m.UkSolarPowerToday})));
const GasShareOfElectricity = lazy(() => import("./pages/GridInsightPages").then(m => ({default:m.GasShareOfElectricity})));
const RenewablesShareToday = lazy(() => import("./pages/GridInsightPages").then(m => ({default:m.RenewablesShareToday})));
const CarbonIntensityToday = lazy(() => import("./pages/GridInsightPages").then(m => ({default:m.CarbonIntensityToday})));
const Today = lazy(() => import("./pages/Today"));
const Yesterday = lazy(() => import("./pages/Yesterday"));
const PowerFlow = lazy(() => import("./pages/PowerFlow"));
const ReportsIndex = lazy(() => import("./pages/Reports").then(m => ({default:m.ReportsIndex})));
const WeeklyReportPage = lazy(() => import("./pages/Reports").then(m => ({default:m.WeeklyReportPage})));
const RecordsIndex = lazy(() => import("./pages/Records").then(m => ({default:m.RecordsIndex})));
const HighestRenewableShare = lazy(() => import("./pages/Records").then(m => ({default:m.HighestRenewableShare})));
const HighestWindGeneration = lazy(() => import("./pages/Records").then(m => ({default:m.HighestWindGeneration})));
const HighestSolarGeneration = lazy(() => import("./pages/Records").then(m => ({default:m.HighestSolarGeneration})));
const HighestGasGeneration = lazy(() => import("./pages/Records").then(m => ({default:m.HighestGasGeneration})));
const Social = lazy(() => import("./pages/Social"));
const Measurement = lazy(() => import("./pages/Measurement"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Partners = lazy(() => import("./pages/Partners"));
const DigestPreview = lazy(() => import("./pages/DigestPreview"));
const AdminSocialPosts = lazy(() => import("./pages/AdminSocialPosts"));
const ShareDailySummary = lazy(() => import("./pages/ShareDailySummary"));
const AdminDailySummary = lazy(() => import("./pages/AdminDailySummary"));
import { SiteFrame } from "./components/SiteFrame";
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
          <SiteFrame><Suspense fallback={<main className="container mx-auto p-12" role="status">Loading this part of the grid…</main>}><Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/wholesale-electricity-price" element={<GridSignalPage kind="price" />} />
            <Route path="/pumped-storage" element={<GridSignalPage kind="storage" />} />
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
            {Object.entries({"uk-electricity-mix":"uk-electricity-mix","uk-renewable-electricity":"renewables","uk-wind-generation-live":"uk-wind-power-today","uk-electricity-carbon-intensity":"carbon-intensity","uk-electricity-imports-exports":"interconnectors"}).flatMap(([alias,target])=>[
              <Route key={alias+".html"} path={"/"+alias+".html"} element={<Navigate to={"/"+target} replace/>}/>,
              ...(alias!==target?[<Route key={alias} path={"/"+alias} element={<Navigate to={"/"+target} replace/>}/>]:[])
            ])}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes></Suspense></SiteFrame>
        </BrowserRouter>
      </EnergyDataProvider>
    </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
