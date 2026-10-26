import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnergyDataProvider } from './contexts/EnergyDataContext';
import { SiteFrame } from './components/SiteFrame';
import { RouteStructuredData } from './components/RouteStructuredData';
import { StaticGridSnapshot } from './components/StaticGridSnapshot';
import Index from './pages/Index';
import Glossary from './pages/Glossary';
import Methodology from './pages/Methodology';
import Data from './pages/Data';
import Today from './pages/Today';
import Yesterday from './pages/Yesterday';
import Citation from './pages/Citation';
import { ReportsIndex, WeeklyReportPage } from './pages/Reports';
import * as Records from './pages/Records';
import * as Explainers from './pages/CoreExplainers';
import * as Insights from './pages/GridInsightPages';

// Render the actual explanatory components; API hooks do not run their effects
// on the server. No crawler-specific content or parallel numerical pipeline.
const pages = {
  '/': Index,
  '/glossary': Glossary, '/methodology': Methodology, '/data': Data,
  '/records': Records.RecordsIndex,
  '/records/highest-renewable-share': Records.HighestRenewableShare,
  '/records/highest-wind-generation': Records.HighestWindGeneration,
  '/records/highest-solar-generation': Records.HighestSolarGeneration,
  '/records/highest-gas-generation': Records.HighestGasGeneration,
  '/today': Today, '/yesterday': Yesterday, '/citation': Citation, '/reports': ReportsIndex,
  '/uk-electricity-mix': Explainers.UkElectricityMix,
  '/carbon-intensity': Explainers.CarbonIntensity,
  '/renewables': Explainers.Renewables,
  '/gas-generation': Explainers.GasGeneration,
  '/nuclear-power': Explainers.NuclearPower,
  '/interconnectors': Explainers.Interconnectors,
  '/electricity-demand': Explainers.ElectricityDemand,
  '/uk-electricity-generation-live': Explainers.UkElectricityGenerationLive,
  '/cleanest-time-to-use-electricity': Explainers.CleanestTimeToUseElectricity,
  '/uk-wind-power-today': Insights.UkWindPowerToday,
  '/uk-solar-power-today': Insights.UkSolarPowerToday,
  '/gas-share-of-electricity': Insights.GasShareOfElectricity,
  '/renewables-share-today': Insights.RenewablesShareToday,
  '/carbon-intensity-today': Insights.CarbonIntensityToday,
};

export function renderPage(route: string) {
  const Page = route.startsWith('/reports/weekly/') ? WeeklyReportPage : pages[route as keyof typeof pages];
  if (!Page) return null;
  const context: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const body = renderToString(
    <HelmetProvider context={context}>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={route}>
          <EnergyDataProvider><RouteStructuredData /><SiteFrame><Routes><Route path={route.startsWith('/reports/weekly/') ? '/reports/weekly/:date' : '*'} element={<Page />} /></Routes></SiteFrame></EnergyDataProvider>
        </StaticRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
  queryClient.clear();
  return { body, head: (['title', 'meta', 'link', 'script'] as const).map(key => context.helmet?.[key]?.toString() || '').join('') };
}

export const renderInitialEvidence = () => renderToString(<StaticGridSnapshot />);
