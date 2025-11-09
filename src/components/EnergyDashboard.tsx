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
import { useState, useEffect } from 'react';

export const EnergyDashboard = () => {
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
    fetchWeeklyData
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
            totalDemandMW={data.totalDemandMW || 0}
            totalGenerationMW={data.totalGenerationMW || 0}
            interconnectorFlowMW={data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0}
            carbonIntensity={data.carbonIntensity}
          />
        )}
        mobileActions={data && (
          <EnergyBalanceDisplay
            totalDemandMW={data.totalDemandMW || 0}
            totalGenerationMW={data.totalGenerationMW || 0}
            interconnectorFlowMW={data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0}
            carbonIntensity={data.carbonIntensity}
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
        />
      )}

      {/* Energy Mix Summary Section */}
      {data && (
        <div className="border-t border-primary/20 glass-morphism shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow opacity-50"></div>
          <div className="container mx-auto px-3 py-2.5 md:px-4 md:py-3 lg:px-6 lg:py-4 relative z-10">
            <div className="flex items-center justify-center gap-3 md:gap-6 lg:gap-8">
              {/* Renewables */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Leaf className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-400" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Renewables</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-green-400 text-glow">{energyCategories.renewables}%</div>
                </div>
              </div>
              
              {/* Fossil Fuels */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Flame className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-energy-gas" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Fossil Fuels</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-energy-gas text-glow">{energyCategories.fossilFuels}%</div>
                </div>
              </div>
              
              {/* Other */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-cosmic-cyan" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Other</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-cosmic-cyan text-glow">{energyCategories.other}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-2 md:px-4 pt-0 pb-8">
        <div className="space-y-8">
          {/* Generation Mix Chart - Progressive Loading */}
          {!data && loading ? (
            <ChartSkeleton />
          ) : data ? (
            <>
              {/* Show stub/LKG notice if no generation data */}
              {data.generationMix.length === 0 && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-muted-foreground">Awaiting live data (stub/LKG)</p>
                </div>
              )}
              
              {/* Generation Mix Chart - Hero Element */}
              <div className="relative">
                <GenerationMixChart 
                  data={data.generationMix} 
                  totalGenerationMW={data.totalGenerationMW || 0}
                  dataFreshness={data.dataFreshness}
                  asOf={data.asOf}
                />
              </div>
            </>
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
            Contains BMRS data © Elexon Limited copyright and database right 2025
          </div>
        </div>
      </footer>
    </div>
  );
};