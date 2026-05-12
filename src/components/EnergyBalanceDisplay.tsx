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
      {/* Mobile: clear metric pills, replacing the old equation shorthand */}
      <div className="grid md:hidden grid-cols-2 gap-2 text-xs w-full">
        <div className="rounded-xl border border-primary/15 bg-background/45 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Displayed demand</div>
          <div className="mt-0.5 font-mono text-base font-bold text-foreground">{formatGWfromMW(totalDemandMW)} <span className="text-[10px] font-medium text-muted-foreground">GW</span></div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 shadow-[0_0_18px_rgba(28,222,228,0.10)]">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">GB production</div>
          <div className="mt-0.5 font-mono text-base font-bold text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)} <span className="text-[10px] font-medium text-muted-foreground">GW</span></div>
        </div>
        <div className="rounded-xl border border-primary/15 bg-background/45 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Transfers</div>
          <div className="mt-0.5 font-mono text-base font-bold text-foreground">{formatGWfromMW(Math.abs(interconnectorFlowMW))} <span className="text-[10px] font-medium text-muted-foreground">GW</span></div>
          <div className="text-[10px] text-muted-foreground">net {interconnectorFlowMW >= 0 ? 'imports' : 'exports'}</div>
        </div>
        {carbonIntensity && (
          <div className="rounded-xl border border-primary/15 bg-background/45 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Carbon</div>
              <div className={`h-2 w-2 rounded-full ${
                carbonIntensity.index.toLowerCase() === 'very low' || carbonIntensity.index.toLowerCase() === 'low' 
                  ? 'bg-carbon-low' 
                  : carbonIntensity.index.toLowerCase() === 'moderate'
                  ? 'bg-carbon-moderate'
                  : 'bg-carbon-high'
              }`} />
            </div>
            <div className="mt-0.5 font-mono text-base font-bold text-foreground">{carbonIntensity.actual} <span className="text-[10px] font-medium text-muted-foreground">gCO₂/kWh</span></div>
          </div>
        )}
      </div>

      {/* Tablet: Medium Energy Balance */}
      <div className="hidden md:flex xl:hidden items-center gap-2.5 px-3 py-2 glass-morphism rounded-lg border-primary/20 text-sm">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            Displayed demand
            <HelpTooltip content="Consumer-facing GB demand derived from live power balance: GB production plus net imports/exports plus pumped-storage transfer. This differs from raw BMRS transmission demand." className="w-3 h-3" />
          </div>
          <div className="font-bold">{formatGWfromMW(totalDemandMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">=</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            GB production
            <HelpTooltip content="Domestic Great Britain electricity production, including embedded wind and solar estimates, excluding imports." className="w-3 h-3" />
          </div>
          <div className="font-bold text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)} GW</div>
        </div>
        <div className="text-lg text-muted-foreground">+</div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-0.5">
            Transfers
            <HelpTooltip content="Net electricity flow through interconnectors. Positive = importing into GB, negative = exporting from GB." className="w-3 h-3" />
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

      {/* Desktop: Compact Energy Balance with Single Letters */}
      <div className="hidden xl:flex items-center gap-2.5 px-3 py-2 glass-morphism rounded-lg border-primary/20 text-sm">
        <div className="flex items-center gap-0.5">
          <span className="font-semibold text-muted-foreground" title="Displayed demand">D</span>
          <HelpTooltip content="Displayed GB demand derived from live power balance. This is not the raw BMRS ITSDO transmission-demand field." className="w-3.5 h-3.5" />
          <span className="font-bold ml-1">{formatGWfromMW(totalDemandMW)}</span>
        </div>
        <span className="text-muted-foreground">=</span>
        <div className="flex items-center gap-0.5">
          <span className="font-semibold text-muted-foreground" title="GB production">P</span>
          <HelpTooltip content="GB production: domestic generation including embedded wind and solar estimates, excluding imports." className="w-3.5 h-3.5" />
          <span className="font-bold text-cosmic-cyan text-glow ml-1">{formatGWfromMW(totalGenerationMW)}</span>
        </div>
        <span className="text-muted-foreground">+</span>
        <div className="flex items-center gap-0.5">
          <span className="font-semibold text-muted-foreground" title="Transfers">T</span>
          <HelpTooltip content="Net interconnector transfer. Positive = importing into GB, negative = exporting from GB." className="w-3.5 h-3.5" />
          <span className="font-bold ml-1">{formatGWfromMW(interconnectorFlowMW)}</span>
        </div>
        {carbonIntensity && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${
                carbonIntensity.index.toLowerCase() === 'very low' || carbonIntensity.index.toLowerCase() === 'low' 
                  ? 'bg-carbon-low animate-pulse' 
                  : carbonIntensity.index.toLowerCase() === 'moderate'
                  ? 'bg-carbon-moderate animate-pulse'
                  : 'bg-carbon-high animate-pulse'
              }`} />
              <span className="font-semibold text-muted-foreground" title="Carbon Intensity">C</span>
              <HelpTooltip content="Average carbon intensity of electricity generation, measured in grams of CO₂ per kilowatt-hour" className="w-3.5 h-3.5" />
              <span className="font-bold font-mono ml-0.5">{carbonIntensity.actual}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
};
