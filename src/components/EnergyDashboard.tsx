import { RefreshCw, Info } from 'lucide-react';
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
            <div className="flex flex-col gap-1">
              <img 
                src={energyMixLogo} 
                alt="Energy Mix" 
                className="h-12 w-auto"
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

            <div className="flex items-center gap-6">
              {data && (
                  <>
                    <div className="hidden md:flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Generation</div>
                        <div className="font-bold text-primary">{formatGWfromMW(data.totalGenerationMW || 0)} GW</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Demand</div>
                        <div className="font-bold text-foreground">{formatGWfromMW(data.totalDemandMW || 0)} GW</div>
                      </div>
                      {data.carbonIntensity && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border">
                          <div className={`w-3 h-3 rounded-full ${
                            data.carbonIntensity.index.toLowerCase() === 'very low' || data.carbonIntensity.index.toLowerCase() === 'low' 
                              ? 'bg-carbon-low animate-pulse' 
                              : data.carbonIntensity.index.toLowerCase() === 'moderate'
                              ? 'bg-carbon-moderate animate-pulse'
                              : 'bg-carbon-high animate-pulse'
                          }`} />
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Carbon</div>
                            <div className="font-bold font-mono text-foreground">
                              {data.carbonIntensity.actual} <span className="text-xs font-normal">gCO₂/kWh</span>
                            </div>
                          </div>
                        </div>
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
              
              <Button 
                onClick={refetch} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

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