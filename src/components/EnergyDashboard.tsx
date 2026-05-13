import { RefreshCw, Leaf, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavigationBar } from '@/components/NavigationBar';
import { Link } from 'react-router-dom';
import { GenerationMixChart } from '@/components/GenerationMixChart';
import { InterconnectorFlows } from '@/components/InterconnectorFlows';
import { HistoricalGenerationChart } from '@/components/HistoricalGenerationChart';
import { EUDebugPanel } from '@/components/EUDebugPanel';
import { SettlementPeriodCountdown } from '@/components/SettlementPeriodCountdown';
import { useEnergyData } from '@/contexts/EnergyDataContext';
import { useHistoricalGeneration } from '@/hooks/useHistoricalGeneration';
import { ChartSkeleton, InterconnectorSkeleton, EUCardSkeleton } from '@/components/LoadingSkeleton';
import { StatusIndicator } from '@/components/StatusIndicator';
import { OfflineOverlay } from '@/components/OfflineOverlay';
import { EnergyBalanceDisplay } from '@/components/EnergyBalanceDisplay';
import { SystemStatusBanner } from '@/components/SystemStatusBanner';
import { TopMetricsStrip } from '@/components/TopMetricsStrip';
import { HelpTooltip } from '@/components/HelpTooltip';
import { PowerFlowCard } from '@/components/PowerFlowCard';
import { DemandReconciliationPanel } from '@/components/DemandReconciliationPanel';
import { useGridSignals } from '@/hooks/useGridSignals';
import { useState, useEffect, ReactNode } from 'react';

interface EnergyDashboardProps {
  belowContent?: ReactNode;
}

export const EnergyDashboard = ({ belowContent }: EnergyDashboardProps) => {
  const {
    data, 
    loading, 
    error, 
    nextUpdateAt, 
    nextHighFreqAt, 
    nextMidFreqAt, 
    lastUpdateType, 
    refetch 
  } = useEnergyData();
  const { 
    data: historicalData, 
    loading: historicalLoading, 
    error: historicalError, 
    lastUpdated: historicalLastUpdated,
    meta: historicalMeta,
    weeklyData,
    weeklyLoading,
    weeklyError,
    weeklyLastUpdated,
    weeklyMeta,
    fetchWeeklyData,
    forecastData,
    forecastLoading,
    fetchForecastData
  } = useHistoricalGeneration();

  // Calculate time until next settlement period
  const [timeUntilNextSP, setTimeUntilNextSP] = useState<string>('');
  const [dataAge, setDataAge] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!data?.lastUpdated) return;

    const updateTimers = () => {
      const now = new Date();
      const lastUpdate = new Date(data.lastUpdated);
      
      // Calculate data age
      const ageMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
      setDataAge(ageMinutes.toString());

      // Calculate next settlement period
      const currentMinute = now.getMinutes();
      const minutesUntilNext = currentMinute < 30 ? 30 - currentMinute : 60 - currentMinute;
      const secondsUntilNext = 60 - now.getSeconds();
      setTimeUntilNextSP(`${minutesUntilNext - 1}:${secondsUntilNext.toString().padStart(2, '0')}`);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [data?.lastUpdated]);

  // Update loading progress indicator
  useEffect(() => {
    if (loading && !data) {
      setLoadingProgress(30); // Initial API call started
    } else if (data && historicalLoading) {
      setLoadingProgress(70); // Energy data loaded, historical loading
    } else if (data && !historicalLoading) {
      setLoadingProgress(100); // Everything loaded
      // Hide progress bar after 500ms
      const timer = setTimeout(() => setLoadingProgress(0), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, historicalLoading]);

  console.log('EnergyDashboard render:', { 
    hasData: !!data, 
    loading, 
    error, 
    lastUpdateType,
    nextUpdateAt,
    nextHighFreqAt,
    nextMidFreqAt
  });

  // Calculate energy mix categories
  const calculateEnergyCategories = () => {
    if (!data?.generationMix || !data.totalGenerationMW || data.totalGenerationMW === 0) {
      return { renewables: '0.0', fossilFuels: '0.0', other: '0.0' };
    }

    const renewables = ['Wind', 'Solar', 'Hydro', 'PSH'];
    const fossilFuels = ['Gas', 'Oil']; // Coal removed - UK coal generation ended Sept 2024
    
    const renewablesMW = data.generationMix
      .filter(item => renewables.includes(item.name))
      .reduce((sum, item) => sum + item.value, 0);
      
    const fossilMW = data.generationMix
      .filter(item => fossilFuels.includes(item.name))
      .reduce((sum, item) => sum + item.value, 0);
      
    const otherMW = data.totalGenerationMW - renewablesMW - fossilMW;
    
    return {
      renewables: (renewablesMW / data.totalGenerationMW * 100).toFixed(1),
      fossilFuels: (fossilMW / data.totalGenerationMW * 100).toFixed(1),
      other: (otherMW / data.totalGenerationMW * 100).toFixed(1),
    };
  };

  const energyCategories = calculateEnergyCategories();
  const gridSignals = useGridSignals({
    marketIndexPrice: data?.marketIndexPrice || null,
    systemFrequency: data?.systemFrequency || null,
    storage: data?.storage || null,
  });
  const marketIndexPriceSignal = data?.marketIndexPrice || gridSignals.marketIndexPrice;
  const systemFrequencySignal = data?.systemFrequency || gridSignals.systemFrequency;
  const storageSignal = data?.storage || gridSignals.storage;
  const netInterconnectorFlowMW = data?.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0;
  const storageTransferMW = storageSignal?.netMW || 0;
  const derivedDemandMW = data ? Math.max(0, data.totalGenerationMW + netInterconnectorFlowMW + storageTransferMW) : 0;
  const isUsingDerivedDemand = data && derivedDemandMW > 0 && Math.abs(derivedDemandMW - data.totalDemandMW) > 2500;
  const displayDemandMW = isUsingDerivedDemand
    ? derivedDemandMW
    : (data?.totalDemandMW || 0);
  const showDemandQA = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugDemand') === '1';

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Failed to Load Data</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none"></div>
      <OfflineOverlay />
      
      {/* Navigation Bar */}
      <NavigationBar
        desktopActions={data && (
          <EnergyBalanceDisplay
            totalDemandMW={displayDemandMW}
            totalGenerationMW={data.totalGenerationMW || 0}
            interconnectorFlowMW={data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0}
            carbonIntensity={data.carbonIntensity}
          />
        )}
        mobileActions={data && (
          <EnergyBalanceDisplay
            totalDemandMW={displayDemandMW}
            totalGenerationMW={data.totalGenerationMW || 0}
            interconnectorFlowMW={data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0}
            carbonIntensity={data.carbonIntensity}
            marketIndexPrice={marketIndexPriceSignal}
            systemFrequency={systemFrequencySignal}
            storage={storageSignal}
          />
        )}
      />

      {/* Loading Progress Bar */}
      {loadingProgress > 0 && loadingProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
          <div 
            className="h-full bg-cosmic-cyan transition-all duration-300 shadow-glow"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      {/* System Status Banner */}
      {data && (
        <SystemStatusBanner
          settlementPeriod={data.asOf?.settlementPeriod}
          timeUntilNextSP={timeUntilNextSP}
          dataAge={dataAge}
          isRealtime={data.dataFreshness?.isRealtime}
          nextUpdate={nextUpdateAt ? new Date(nextUpdateAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined}
          sourceFreshness={data.dataFreshness?.sourceFreshness}
        />
      )}

      {data && (
        <TopMetricsStrip
          totalGenerationMW={data.totalGenerationMW || 0}
          carbonIntensity={data.carbonIntensity}
          marketIndexPrice={marketIndexPriceSignal}
          systemFrequency={systemFrequencySignal}
          storage={storageSignal}
        />
      )}

      {/* Energy Mix Summary Section */}
      {data && (
        <div className="hidden md:block border-t border-primary/20 glass-morphism shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50"></div>
          <div className="container mx-auto px-3 py-2.5 md:px-4 md:py-3 lg:px-6 lg:py-4 relative z-10">
            <div className="flex items-center justify-center gap-3 md:gap-6 lg:gap-8">
              {/* Renewables */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Leaf className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-400" />
                <div>
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <span>Renewables</span>
                    <HelpTooltip 
                      content={
                        <div className="space-y-1">
                          <p className="font-medium">Includes:</p>
                          <p>Wind, Solar, Hydro, and Pumped Storage Hydro (PSH)</p>
                          <p className="text-xs text-muted-foreground mt-2">Based on UK domestic generation only (excludes imports)</p>
                        </div>
                      }
                      className="w-3 h-3 md:w-4 md:h-4"
                    />
                  </div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-green-400 text-glow">{energyCategories.renewables}%</div>
                </div>
              </div>
              
              {/* Fossil Fuels */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Flame className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-energy-gas" />
                <div>
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <span>Fossil Fuels</span>
                    <HelpTooltip 
                      content={
                        <div className="space-y-1">
                          <p className="font-medium">Includes:</p>
                          <p>Gas and Oil</p>
                          <p className="text-xs text-muted-foreground mt-1">(UK coal generation ended September 2024)</p>
                          <p className="text-xs text-muted-foreground mt-2">Based on UK domestic generation only (excludes imports)</p>
                        </div>
                      }
                      className="w-3 h-3 md:w-4 md:h-4"
                    />
                  </div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-energy-gas text-glow">{energyCategories.fossilFuels}%</div>
                </div>
              </div>
              
              {/* Other */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-cosmic-cyan" />
                <div>
                  <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                    <span>Other</span>
                    <HelpTooltip 
                      content={
                        <div className="space-y-1">
                          <p className="font-medium">Includes:</p>
                          <p>Biomass, Nuclear, and other generation types</p>
                          <p className="text-xs text-muted-foreground mt-2">Based on UK domestic generation only (excludes imports)</p>
                        </div>
                      }
                      className="w-3 h-3 md:w-4 md:h-4"
                    />
                  </div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-cosmic-cyan text-glow">{energyCategories.other}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-4 pb-8 md:px-4 md:pt-0">
        <div className="space-y-5 md:space-y-8">
          {/* Generation Mix Chart - Progressive Loading */}
          {!data && loading ? (
            <ChartSkeleton />
          ) : data ? (
            <div className="flex flex-col gap-y-5 md:gap-y-8">
              {/* Show stub/LKG notice if no generation data */}
              {data.generationMix.length === 0 && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-muted-foreground">Awaiting live data (stub/LKG)</p>
                </div>
              )}

              <div className="order-1 md:order-2">
                <PowerFlowCard
                  generationMix={data.generationMix}
                  interconnectors={data.interconnectors}
                  totalDemandMW={displayDemandMW}
                  totalGenerationMW={data.totalGenerationMW || 0}
                  carbonIntensity={data.carbonIntensity}
                  settlementPeriod={data.asOf?.settlementPeriod}
                  sourceTimestamp={data.dataFreshness?.sourceFreshness?.generation?.timestamp || data.asOf?.endISO}
                />
              </div>

              {showDemandQA && (
                <div className="order-2 md:order-3">
                  <DemandReconciliationPanel
                    rawDemandMW={data.totalDemandMW || 0}
                    displayedDemandMW={displayDemandMW}
                    generationMW={data.totalGenerationMW || 0}
                    netTransfersMW={netInterconnectorFlowMW}
                    storageMW={storageTransferMW}
                  />
                </div>
              )}

              {/* Generation Mix Chart - Hero Element */}
              <div className="relative order-3 md:order-1">
                <GenerationMixChart 
                  data={data.generationMix} 
                  totalGenerationMW={data.totalGenerationMW || 0}
                  dataFreshness={data.dataFreshness}
                  asOf={data.asOf}
                />
              </div>
            </div>
          ) : null}

          {/* Historical Generation Chart - Progressive Loading */}
          {historicalLoading ? (
            <ChartSkeleton />
          ) : historicalError ? (
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
              <p className="text-destructive">Failed to load historical data: {historicalError}</p>
            </div>
          ) : historicalData.length > 0 ? (
            <HistoricalGenerationChart 
              data={historicalData} 
              lastUpdated={historicalLastUpdated}
              meta={historicalMeta}
              weeklyData={weeklyData}
              weeklyLoading={weeklyLoading}
              weeklyError={weeklyError}
              weeklyLastUpdated={weeklyLastUpdated}
              weeklyMeta={weeklyMeta}
              onFetchWeeklyData={fetchWeeklyData}
              forecastData={forecastData}
              forecastLoading={forecastLoading}
              onFetchForecastData={fetchForecastData}
            />
          ) : null}

          {/* Interconnector Flows - Progressive Loading */}
          {!data && loading ? (
            <InterconnectorSkeleton />
          ) : data ? (
            <InterconnectorFlows 
              data={data.interconnectors} 
              interconnectorStatus={data.dataFreshness?.interconnectorStatus}
            />
          ) : null}

          {/* EU Debug Panel (only shows in debug mode) */}
          <EUDebugPanel />
        </div>
      </main>

      {belowContent}

      {/* Footer */}
      <footer className="border-t border-primary/20 glass-morphism mt-16 relative">
        <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
        <div className="container mx-auto px-4 py-6 relative z-10">
          <nav className="flex justify-center gap-6 mb-4 flex-wrap">
            <Link to="/about" className="text-sm text-foreground/70 hover:text-primary transition-colors">About</Link>
            <Link to="/data" className="text-sm text-foreground/70 hover:text-primary transition-colors">Data</Link>
            <Link to="/insights" className="text-sm text-foreground/70 hover:text-primary transition-colors">Insights</Link>
            <Link to="/newsletter" className="text-sm text-foreground/70 hover:text-primary transition-colors">Newsletter</Link>
          </nav>
          <div className="text-xs text-foreground/50 text-center">
            Contains BMRS data © Elexon Limited copyright and database right 2026
          </div>
        </div>
      </footer>
    </div>
  );
};
