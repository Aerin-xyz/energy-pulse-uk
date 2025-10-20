import { formatGWfromMW } from '@/lib/utils';

interface EnergyBalanceDisplayProps {
  totalDemandMW: number;
  totalGenerationMW: number;
  interconnectorFlowMW: number;
  carbonIntensity?: {
    actual: number;
    index: string;
  };
}

export const EnergyBalanceDisplay = ({
  totalDemandMW,
  totalGenerationMW,
  interconnectorFlowMW,
  carbonIntensity,
}: EnergyBalanceDisplayProps) => {
  return (
    <>
      {/* Mobile: Compact Energy Balance */}
      <div className="flex md:hidden items-center gap-2 px-3 py-1.5 bg-muted/30 backdrop-blur-sm rounded-lg border border-border text-xs w-full justify-between">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">D</div>
          <div className="font-bold">{formatGWfromMW(totalDemandMW)}</div>
        </div>
        <span className="text-muted-foreground">=</span>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">G</div>
          <div className="font-bold text-primary">{formatGWfromMW(totalGenerationMW)}</div>
        </div>
        <span className="text-muted-foreground">+</span>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">T</div>
          <div className="font-bold">{formatGWfromMW(interconnectorFlowMW)}</div>
        </div>
        {carbonIntensity && (
          <>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                carbonIntensity.index.toLowerCase() === 'very low' || carbonIntensity.index.toLowerCase() === 'low' 
                  ? 'bg-carbon-low animate-pulse' 
                  : carbonIntensity.index.toLowerCase() === 'moderate'
                  ? 'bg-carbon-moderate animate-pulse'
                  : 'bg-carbon-high animate-pulse'
              }`} />
              <div className="font-bold font-mono">{carbonIntensity.actual}</div>
            </div>
          </>
        )}
      </div>

      {/* Tablet: Medium Energy Balance */}
      <div className="hidden md:flex lg:hidden items-center gap-2.5 px-3 py-2 bg-muted/30 backdrop-blur-sm rounded-lg border border-border text-sm">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">Demand</div>
          <div className="font-bold">{formatGWfromMW(totalDemandMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">=</div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">Generation</div>
          <div className="font-bold text-primary">{formatGWfromMW(totalGenerationMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">+</div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground mb-0.5">Transfers</div>
          <div className="font-bold">{formatGWfromMW(interconnectorFlowMW)} GW</div>
        </div>
        {carbonIntensity && (
          <>
            <div className="w-px h-8 bg-border mx-1" />
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                carbonIntensity.index.toLowerCase() === 'very low' || carbonIntensity.index.toLowerCase() === 'low' 
                  ? 'bg-carbon-low animate-pulse' 
                  : carbonIntensity.index.toLowerCase() === 'moderate'
                  ? 'bg-carbon-moderate animate-pulse'
                  : 'bg-carbon-high animate-pulse'
              }`} />
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Carbon</div>
                <div className="font-bold font-mono">
                  {carbonIntensity.actual} <span className="text-[10px] font-normal">gCO₂/kWh</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop: Full Energy Balance Equation */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-muted/30 backdrop-blur-sm rounded-lg border border-border">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Demand</div>
          <div className="font-bold text-lg">{formatGWfromMW(totalDemandMW)} GW</div>
        </div>
        <div className="text-2xl text-muted-foreground">=</div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Generation</div>
          <div className="font-bold text-lg text-primary">{formatGWfromMW(totalGenerationMW)} GW</div>
        </div>
        <div className="text-2xl text-muted-foreground">+</div>
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">Transfers</div>
          <div className="font-bold text-lg">{formatGWfromMW(interconnectorFlowMW)} GW</div>
        </div>
        {carbonIntensity && (
          <>
            <div className="w-px h-12 bg-border mx-2" />
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                carbonIntensity.index.toLowerCase() === 'very low' || carbonIntensity.index.toLowerCase() === 'low' 
                  ? 'bg-carbon-low animate-pulse' 
                  : carbonIntensity.index.toLowerCase() === 'moderate'
                  ? 'bg-carbon-moderate animate-pulse'
                  : 'bg-carbon-high animate-pulse'
              }`} />
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Carbon</div>
                <div className="font-bold font-mono text-lg">
                  {carbonIntensity.actual} <span className="text-xs font-normal">gCO₂/kWh</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
