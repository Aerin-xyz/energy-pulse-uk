import { RefreshCw, Info, Leaf, Flame, Zap } from 'lucide-react';
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
import { NextUpdateCountdown } from '@/components/NextUpdateCountdown';
// import { UpdateFrequencyIndicator } from '@/components/UpdateFrequencyIndicator';

import { formatGWfromMW } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <header className="border-b border-border bg-card/60 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-2 -ml-2">
              <img 
                src={energyMixLogo} 
                alt="Energy Mix" 
                className="h-24 w-auto object-contain"
              />
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">Real-time UK electricity generation and flows</p>
                {data && (
                  <StatusIndicator 
                    isRealtime={data.dataFreshness?.isRealtime}
                    variant={data.dataFreshness?.variant}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
              {data && (
                  <>
                    {/* Mobile: Compact Energy Balance */}
                    <div className="flex md:hidden items-center gap-2 px-3 py-1.5 bg-card/60 backdrop-blur-sm rounded-lg border border-border text-xs w-full justify-between">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">D</div>
                        <div className="font-bold">{formatGWfromMW(data.totalDemandMW || 0)}</div>
                      </div>
                      <span className="text-muted-foreground">=</span>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">G</div>
                        <div className="font-bold text-primary">{formatGWfromMW(data.totalGenerationMW || 0)}</div>
                      </div>
                      <span className="text-muted-foreground">+</span>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">T</div>
                        <div className="font-bold">
                          {formatGWfromMW(
                            data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0
                          )}
                        </div>
                      </div>
                      {data.carbonIntensity && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              data.carbonIntensity.index.toLowerCase() === 'very low' || data.carbonIntensity.index.toLowerCase() === 'low' 
                                ? 'bg-carbon-low animate-pulse' 
                                : data.carbonIntensity.index.toLowerCase() === 'moderate'
                                ? 'bg-carbon-moderate animate-pulse'
                                : 'bg-carbon-high animate-pulse'
                            }`} />
                            <div className="font-bold font-mono">
                              {data.carbonIntensity.actual}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Tablet: Medium Energy Balance */}
                    <div className="hidden md:flex lg:hidden items-center gap-2.5 px-3 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border text-sm">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Demand</div>
                        <div className="font-bold">{formatGWfromMW(data.totalDemandMW || 0)} GW</div>
                      </div>
                      <div className="text-lg text-muted-foreground">=</div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Generation</div>
                        <div className="font-bold text-primary">{formatGWfromMW(data.totalGenerationMW || 0)} GW</div>
                      </div>
                      <div className="text-lg text-muted-foreground">+</div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Transfers</div>
                        <div className="font-bold">
                          {formatGWfromMW(
                            data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0
                          )} GW
                        </div>
                      </div>
                      {data.carbonIntensity && (
                        <>
                          <div className="w-px h-8 bg-border mx-1" />
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              data.carbonIntensity.index.toLowerCase() === 'very low' || data.carbonIntensity.index.toLowerCase() === 'low' 
                                ? 'bg-carbon-low animate-pulse' 
                                : data.carbonIntensity.index.toLowerCase() === 'moderate'
                                ? 'bg-carbon-moderate animate-pulse'
                                : 'bg-carbon-high animate-pulse'
                            }`} />
                            <div className="text-center">
                              <div className="text-[10px] text-muted-foreground">Carbon</div>
                              <div className="font-bold font-mono">
                                {data.carbonIntensity.actual} <span className="text-[10px] font-normal">gCO₂/kWh</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Desktop: Full Energy Balance Equation */}
                    <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Demand</div>
                        <div className="font-bold text-lg">{formatGWfromMW(data.totalDemandMW || 0)} GW</div>
                      </div>
                      <div className="text-2xl text-muted-foreground">=</div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Generation</div>
                        <div className="font-bold text-lg text-primary">{formatGWfromMW(data.totalGenerationMW || 0)} GW</div>
                      </div>
                      <div className="text-2xl text-muted-foreground">+</div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Transfers</div>
                        <div className="font-bold text-lg">
                          {formatGWfromMW(
                            data.interconnectors?.reduce((sum, ic) => sum + (ic.flow || 0), 0) || 0
                          )} GW
                        </div>
                      </div>
                      {data.carbonIntensity && (
                        <>
                          <div className="w-px h-12 bg-border mx-2" />
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              data.carbonIntensity.index.toLowerCase() === 'very low' || data.carbonIntensity.index.toLowerCase() === 'low' 
                                ? 'bg-carbon-low animate-pulse' 
                                : data.carbonIntensity.index.toLowerCase() === 'moderate'
                                ? 'bg-carbon-moderate animate-pulse'
                                : 'bg-carbon-high animate-pulse'
                            }`} />
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground">Carbon</div>
                              <div className="font-bold font-mono text-lg">
                                {data.carbonIntensity.actual} <span className="text-xs font-normal">gCO₂/kWh</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 cursor-help text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Data shows the last completed 30-minute settlement period. There's typically a 5-10 minute delay for validation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* Energy Mix Summary Section */}
      {data && (
        <div className="border-t border-border bg-card/60 backdrop-blur-sm shadow-sm">
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
                <Flame className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-orange-500" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Fossil Fuels</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-orange-600">{energyCategories.fossilFuels}%</div>
                </div>
              </div>
              
              {/* Other */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-purple-500" />
                <div>
                  <div className="text-xs md:text-sm text-muted-foreground">Other</div>
                  <div className="font-bold text-lg md:text-xl lg:text-2xl text-purple-600">{energyCategories.other}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading && !data ? (
          <div className="space-y-8">
            <ChartSkeleton />
            <InterconnectorSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border rounded-lg">
                <EUCardSkeleton />
              </div>
              <div className="border rounded-lg">
                <EUCardSkeleton />
              </div>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Show stub/LKG notice if no generation data */}
            {data.generationMix.length === 0 && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                <p className="text-muted-foreground">Awaiting live data (stub/LKG)</p>
              </div>
            )}
            
            {/* Settlement Period Countdown */}
            {data && <SettlementPeriodCountdown lastUpdated={data.lastUpdated} />}
            
            {/* Generation Mix Chart */}
            <GenerationMixChart 
              data={data.generationMix} 
              totalGenerationMW={data.totalGenerationMW || 0}
              dataFreshness={data.dataFreshness}
              asOf={data.asOf}
            />

            {/* Historical Generation Chart */}
            {historicalLoading ? (
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
            )}

            {/* Interconnector Flows */}
            <InterconnectorFlows 
              data={data.interconnectors} 
              interconnectorStatus={data.dataFreshness?.interconnectorStatus}
            />

            {/* EU Debug Panel (only shows in debug mode) */}
            <EUDebugPanel />
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-md mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Data sources: BMRS HV + ESO embedded wind + PV Live solar + ENTSO-E interconnectors
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live data from BMRS every 5 minutes</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};