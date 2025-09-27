import { RefreshCw, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenerationMixChart } from '@/components/GenerationMixChart';
import { InterconnectorFlows } from '@/components/InterconnectorFlows';
import { EUDebugPanel } from '@/components/EUDebugPanel';
import { useEnergyData } from '@/hooks/useEnergyData';
import { ChartSkeleton, InterconnectorSkeleton, EUCardSkeleton } from '@/components/LoadingSkeleton';
import { StatusIndicator } from '@/components/StatusIndicator';
import { OfflineOverlay } from '@/components/OfflineOverlay';
import { NextUpdateCountdown } from '@/components/NextUpdateCountdown';
// import { UpdateFrequencyIndicator } from '@/components/UpdateFrequencyIndicator';
import { DiagnosticsPanel } from '@/components/DiagnosticsPanel';
import { formatGWfromMW } from '@/lib/utils';

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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-energy rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">UK Energy Mix Dashboard</h1>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">Real-time electricity generation and flows</p>
                  {data && (
                    <StatusIndicator 
                      isRealtime={data.dataFreshness?.isRealtime}
                      variant={data.dataFreshness?.variant}
                    />
                  )}
                </div>
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
                    </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="hidden sm:inline">Last updated: </span>
                      <span>{data.lastUpdated.toLocaleTimeString()}</span>
                    </div>
            {/* Temporarily commenting out UpdateFrequencyIndicator to debug
            {lastUpdateType && (
              <UpdateFrequencyIndicator 
                updateType={lastUpdateType}
                nextHighFreqAt={nextHighFreqAt}
                nextMidFreqAt={nextMidFreqAt}
                nextUpdateAt={nextUpdateAt}
              />
            )} */}
            <NextUpdateCountdown 
              nextUpdateAt={nextUpdateAt} 
              updateType={lastUpdateType || 'full'}
            />
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
        <DiagnosticsPanel />
        
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
            
            {/* Generation Mix Chart */}
            <GenerationMixChart 
              data={data.generationMix} 
              totalGenerationMW={data.totalGenerationMW || 0}
              dataFreshness={data.dataFreshness}
              asOf={data.asOf}
            />

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
      <footer className="border-t border-border bg-card/30 mt-16">
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