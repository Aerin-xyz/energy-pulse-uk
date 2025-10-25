import { RefreshCw, Leaf, Flame, Zap } from 'lucide-react';
import energyMixLogo from '@/assets/energy-mix-logo.png';
import { Button } from '@/components/ui/button';
import { GenerationMixChart } from '@/components/GenerationMixChart';
import { InterconnectorFlows } from '@/components/InterconnectorFlows';
import { HistoricalGenerationChart } from '@/components/HistoricalGenerationChart';
import { EUDebugPanel } from '@/components/EUDebugPanel';
import { SettlementPeriodCountdown } from '@/components/SettlementPeriodCountdown';
import { useEnergyData } from '@/hooks/useEnergyData';
import { useHistoricalGeneration } from '@/hooks/useHistoricalGeneration';
import { ChartSkeleton, InterconnectorSkeleton, EUCardSkeleton } from '@/components/LoadingSkeleton';
import { StatusIndicator } from '@/components/StatusIndicator';
import { OfflineOverlay } from '@/components/OfflineOverlay';
import { EnergyBalanceDisplay } from '@/components/EnergyBalanceDisplay';
import { HelpTooltip } from '@/components/HelpTooltip';
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
    const fossilFuels = ['Gas', 'Coal', 'Oil'];
    
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
    <div className="min-h-screen bg-background">
      <OfflineOverlay />
      {/* Header */}
      <header className="border-b border-border bg-card backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-2 -ml-2">
              <img 
                src={energyMixLogo} 
                alt="Energy Mix" 
                className="h-24 w-auto object-contain"
              />
              <p className="text-xs text-muted-foreground">Real-time UK electricity generation and flows</p>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
              {data && (
                  <>
                    <EnergyBalanceDisplay
                      totalDemandMW={data.totalDemandMW || 0}
                      totalGenerationMW={data.totalGenerationMW || 0}
                      interconnectorFlowMW={data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0}
                      carbonIntensity={data.carbonIntensity}
                    />
                    <HelpTooltip content="Data shows the last completed 30-minute settlement period. There's typically a 5-10 minute delay for validation." />
                  </>
                )}
            </div>
          </div>
        </div>
      </header>

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
        <div className="border-t border-border bg-[#F2F3F4]/90 backdrop-blur-sm shadow-sm">
          <div className="container mx-auto px-3 py-2.5 md:px-4 md:py-3 lg:px-6 lg:py-4">
            <div className="flex items-center justify-center gap-3 md:gap-6 lg:gap-8">
              {/* Renewables */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Leaf className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-500" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Renewables</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-green-600">{energyCategories.renewables}%</div>
                </div>
              </div>
              
              {/* Fossil Fuels */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Flame className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-[#E5756A]" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Fossil Fuels</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-[#E5756A]">{energyCategories.fossilFuels}%</div>
                </div>
              </div>
              
              {/* Other */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-[#1C70AD]" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Other</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-[#1C70AD]">{energyCategories.other}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-2 md:px-4 pt-0 pb-8">
        {/* OPTIMIZATION: Progressive loading - show critical UI as soon as data arrives */}
        {!data && loading ? (
          <div className="space-y-8">
            <ChartSkeleton />
            <InterconnectorSkeleton />
          </div>
        ) : data ? (
          <div className="space-y-8">
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

            {/* Historical Generation Chart */}
            {(
              historicalLoading ? (
                <ChartSkeleton />
              ) : historicalError ? (
                <div className="text-center text-destructive py-4">
                  Failed to load historical data: {historicalError}
                </div>
              ) : (
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
              )
            )}

            {/* Interconnector Flows */}
            {(
              <InterconnectorFlows 
                data={data.interconnectors} 
                interconnectorStatus={data.dataFreshness?.interconnectorStatus}
              />
            )}

            {/* EU Debug Panel (only shows in debug mode) */}
            <EUDebugPanel />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 bg-[#004683]/95 backdrop-blur-md mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/80">
              Data sources: BMRS HV + ESO embedded wind + PV Live solar + ENTSO-E interconnectors
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#1C70AD] rounded-full animate-pulse"></div>
              <span className="text-sm text-white/80">Live data from BMRS every 5 minutes</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};