import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface InterconnectorData {
  name: string;
  country: string;
  flow: number; // Positive = import, Negative = export
  capacity: number;
  status?: 'live' | 'offline' | 'unavailable' | 'bmrs-fallback';
}

interface InterconnectorFlowsProps {
  data: InterconnectorData[];
  interconnectorStatus?: 'live' | 'cached' | 'unavailable';
}

export const InterconnectorFlows = ({ data, interconnectorStatus = 'live' }: InterconnectorFlowsProps) => {
  const totalImports = data.filter(item => item.flow > 0).reduce((sum, item) => sum + item.flow, 0);
  const totalExports = Math.abs(data.filter(item => item.flow < 0).reduce((sum, item) => sum + item.flow, 0));

  return (
    <Card className="p-6 border-border">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-card-foreground">Interconnector Flows</h2>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button className="text-muted-foreground hover:text-card-foreground transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-semibold text-card-foreground">Interconnector Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="font-medium">Live:</span>
                    <span className="text-muted-foreground">Actively trading electricity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="font-medium">Offline:</span>
                    <span className="text-muted-foreground">Temporarily not operational</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="font-medium">BMRS Fallback:</span>
                    <span className="text-muted-foreground">UK data when ENTSO-E unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="font-medium">Unavailable:</span>
                    <span className="text-muted-foreground">No current data available</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
                  <p>
                    Interconnectors may be offline due to planned maintenance, market conditions, weather, 
                    or technical constraints. This is normal operation.
                  </p>
                  <p>
                    Temporary overloads or reporting delays can push values over 100%.
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        <div className="flex items-center gap-2">
          {interconnectorStatus === 'live' ? (
            <>
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </>
          ) : interconnectorStatus === 'cached' ? (
            <>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Last Known</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span className="text-sm text-muted-foreground">Unavailable</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-energy-imports/20 to-energy-imports/5 border border-energy-imports/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-energy-imports" />
            <span className="text-sm font-medium text-card-foreground">Total Imports</span>
          </div>
          <span className="text-2xl font-bold text-energy-imports">{totalImports.toFixed(1)} MW</span>
        </div>

        <div className="bg-gradient-to-br from-energy-exports/20 to-energy-exports/5 border border-energy-exports/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-energy-exports" />
            <span className="text-sm font-medium text-card-foreground">Total Exports</span>
          </div>
          <span className="text-2xl font-bold text-energy-exports">{totalExports.toFixed(1)} MW</span>
        </div>
      </div>

      {/* Interconnector List */}
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No interconnector data available</p>
            {interconnectorStatus === 'unavailable' && (
              <p className="text-sm mt-1">Unable to fetch current interconnector flows</p>
            )}
          </div>
        ) : (
          data
            .sort((a, b) => {
              // Sort by status first (live > offline > unavailable), then by flow magnitude
              const statusOrder = { live: 4, 'bmrs-fallback': 3, offline: 2, unavailable: 1 };
              const aStatus = statusOrder[a.status || 'unavailable'];
              const bStatus = statusOrder[b.status || 'unavailable'];
              if (aStatus !== bStatus) return bStatus - aStatus;
              return Math.abs(b.flow) - Math.abs(a.flow);
            })
            .map((interconnector, index) => {
            const isImport = interconnector.flow > 0;
            const flowValue = Math.abs(interconnector.flow);
            const utilization = (flowValue / interconnector.capacity) * 100;
            const isActive = (interconnector.status === 'live' || interconnector.status === 'bmrs-fallback') && flowValue > 0;
            const isOffline = interconnector.status === 'offline';
            const isUnavailable = interconnector.status === 'unavailable';
            
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-secondary/30 border-border hover:bg-secondary/40' 
                    : isOffline
                    ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                    : 'bg-muted/20 border-muted hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {/* Flow direction indicator */}
                    {isActive && (
                      <div className={`w-3 h-3 rounded-full ${isImport ? 'bg-energy-imports' : 'bg-energy-exports'}`} />
                    )}
                    
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      interconnector.status === 'live' 
                        ? 'bg-primary animate-pulse' 
                        : interconnector.status === 'bmrs-fallback'
                        ? 'bg-amber-500'
                        : interconnector.status === 'offline'
                        ? 'bg-orange-500'
                        : 'bg-muted'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="font-medium text-card-foreground">
                      {interconnector.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {interconnector.country} • Capacity: {interconnector.capacity && interconnector.capacity > 0 ? `${interconnector.capacity} MW` : 'n/a'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {isActive ? (
                    <>
                      <div className="flex items-center gap-2">
                        {isImport ? (
                          <ArrowDownLeft className="w-4 h-4 text-energy-imports" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-energy-exports" />
                        )}
                        <span className={`text-lg font-bold ${isImport ? 'text-energy-imports' : 'text-energy-exports'}`}>
                          {flowValue.toFixed(0)} MW
                        </span>
                      </div>
                      {interconnector.capacity && interconnector.capacity > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {utilization.toFixed(1)}% utilization
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-right">
                      <span className={`text-sm font-medium ${
                        isOffline ? 'text-orange-500' : 'text-muted-foreground'
                      }`}>
                        {isOffline ? 'Offline' : 'Unavailable'}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {isOffline ? 'No current flow' : 'No data'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })
        )}
      </div>
    </Card>
  );
};