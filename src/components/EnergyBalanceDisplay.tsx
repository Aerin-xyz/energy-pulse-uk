import { formatGWfromMW } from '@/lib/utils';
import { HelpTooltip } from '@/components/HelpTooltip';

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
      <div className="flex md:hidden items-center gap-2.5 px-3 py-2 glass-morphism rounded-lg border-primary/20 text-xs w-full justify-around">
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
            D
            <HelpTooltip content="Total electricity demand across Great Britain in the last settlement period (30 minutes)" className="w-2.5 h-2.5" />
          </div>
          <div className="font-bold">{formatGWfromMW(totalDemandMW)}</div>
        </div>
        <span className="text-muted-foreground">=</span>
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
            G
            <HelpTooltip content="Total electricity generated from all sources within Great Britain" className="w-2.5 h-2.5" />
          </div>
          <div className="font-bold text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)}</div>
        </div>
        <span className="text-muted-foreground">+</span>
        <div className="text-center">
          <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
            T
            <HelpTooltip content="Net electricity flow through interconnectors. Positive = importing, Negative = exporting" className="w-2.5 h-2.5" />
          </div>
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
              <HelpTooltip content="Average carbon intensity of electricity generation, measured in grams of CO₂ per kilowatt-hour" className="w-2.5 h-2.5" />
            </div>
          </>
        )}
      </div>

      {/* Tablet: Medium Energy Balance */}
      <div className="hidden md:flex lg:hidden items-center gap-2.5 px-3 py-2 glass-morphism rounded-lg border-primary/20 text-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            Demand
            <HelpTooltip content="Total electricity demand across Great Britain in the last settlement period (30 minutes)" className="w-3 h-3" />
          </div>
          <div className="font-bold">{formatGWfromMW(totalDemandMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">=</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            Generation
            <HelpTooltip content="Total electricity generated from all sources within Great Britain" className="w-3 h-3" />
          </div>
          <div className="font-bold text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">+</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            Transfers
            <HelpTooltip content="Net electricity flow through interconnectors. Positive = importing, Negative = exporting" className="w-3 h-3" />
          </div>
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
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  Carbon
                  <HelpTooltip content="Average carbon intensity of electricity generation, measured in grams of CO₂ per kilowatt-hour" className="w-3 h-3" />
                </div>
                <div className="font-bold font-mono">
                  {carbonIntensity.actual} <span className="text-[10px] font-normal">gCO₂/kWh</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop: Full Energy Balance Equation */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2 glass-morphism rounded-lg border-primary/20">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            Demand
            <HelpTooltip content="Total electricity demand across Great Britain in the last settlement period (30 minutes)" className="w-4 h-4" />
          </div>
          <div className="font-bold text-lg">{formatGWfromMW(totalDemandMW)} GW</div>
        </div>
        <div className="text-2xl text-muted-foreground">=</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            Generation
            <HelpTooltip content="Total electricity generated from all sources within Great Britain" className="w-4 h-4" />
          </div>
          <div className="font-bold text-lg text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)} GW</div>
        </div>
        <div className="text-2xl text-muted-foreground">+</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
            Transfers
            <HelpTooltip content="Net electricity flow through interconnectors. Positive = importing, Negative = exporting" className="w-4 h-4" />
          </div>
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
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  Carbon
                  <HelpTooltip content="Average carbon intensity of electricity generation, measured in grams of CO₂ per kilowatt-hour" className="w-4 h-4" />
                </div>
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
