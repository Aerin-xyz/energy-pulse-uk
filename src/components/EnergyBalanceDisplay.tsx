import { BatteryCharging, Factory, Leaf, PoundSterling, RadioTower } from 'lucide-react';
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
  marketIndexPrice?: {
    priceGBPPerMWh: number;
    startTime: string;
    status: string;
  } | null;
  systemFrequency?: {
    hz: number;
    deviationHz: number;
    status: string;
  } | null;
  storage?: {
    netMW: number;
    absMW: number;
    mode: 'generating' | 'charging' | 'idle';
    label: string;
  } | null;
}

export const EnergyBalanceDisplay = ({
  totalDemandMW,
  totalGenerationMW,
  interconnectorFlowMW,
  carbonIntensity,
  marketIndexPrice,
  systemFrequency,
  storage,
}: EnergyBalanceDisplayProps) => {
  const carbonTone = carbonIntensity?.index.toLowerCase() === 'very low' || carbonIntensity?.index.toLowerCase() === 'low'
    ? 'text-carbon-low border-carbon-low/25 bg-carbon-low/5'
    : carbonIntensity?.index.toLowerCase() === 'moderate'
      ? 'text-carbon-moderate border-carbon-moderate/25 bg-carbon-moderate/5'
      : 'text-carbon-high border-carbon-high/25 bg-carbon-high/5';
  const storageTone = storage?.mode === 'charging' ? 'text-sky-300 border-sky-300/25 bg-sky-300/5' : storage?.mode === 'generating' ? 'text-emerald-300 border-emerald-300/25 bg-emerald-300/5' : 'text-muted-foreground border-primary/15 bg-background/45';

  return (
    <>
      {/* Mobile: live grid signals summary */}
      <div className="md:hidden w-full rounded-2xl border border-primary/20 bg-background/35 p-3 shadow-[0_0_24px_rgba(28,222,228,0.08)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cosmic-cyan/80">Live grid signals</p>
            <h2 className="mt-0.5 text-base font-semibold text-foreground">Production, carbon, price, frequency and storage</h2>
          </div>
          <HelpTooltip content="Headline GB grid signals: domestic production, carbon intensity, wholesale market index price, system frequency and pumped-storage status." className="mt-1 h-4 w-4 shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 shadow-[0_0_18px_rgba(28,222,228,0.10)]">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Factory className="h-3.5 w-3.5 text-cosmic-cyan" />GB production</span>
              <HelpTooltip content="Domestic Great Britain electricity production, including embedded wind/solar estimates where available. Sources include Elexon FUELINST plus BMRS/NESO fallbacks." className="h-3.5 w-3.5" />
            </div>
            <div className="font-mono text-lg font-bold text-cosmic-cyan text-glow">{formatGWfromMW(totalGenerationMW)} <span className="text-[10px] font-medium text-muted-foreground">GW</span></div>
          </div>

          {carbonIntensity && (
            <div className={`rounded-xl border px-3 py-2.5 ${carbonTone}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5" />Carbon</span>
                <HelpTooltip content="GB carbon intensity from the NESO Carbon Intensity API, measured in grams of CO₂ per kilowatt-hour." className="h-3.5 w-3.5" />
              </div>
              <div className="font-mono text-lg font-bold text-glow">{carbonIntensity.actual} <span className="text-[10px] font-medium text-muted-foreground">gCO₂/kWh</span></div>
            </div>
          )}

          {marketIndexPrice && (
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-1.5"><PoundSterling className="h-3.5 w-3.5 text-amber-300" />Wholesale price</span>
                <HelpTooltip content="Elexon Market Index Price for the latest available period. Wholesale market context only, not a household tariff." className="h-3.5 w-3.5" />
              </div>
              <div className="font-mono text-lg font-bold text-amber-300 text-glow">£{marketIndexPrice.priceGBPPerMWh.toFixed(2)} <span className="text-[10px] font-medium text-muted-foreground">/MWh</span></div>
            </div>
          )}

          {systemFrequency && (
            <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/5 px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-1.5"><RadioTower className="h-3.5 w-3.5 text-emerald-300" />Frequency</span>
                <HelpTooltip content="GB system frequency from Elexon FREQ data. The grid targets 50.000 Hz; small movements around target are normal." className="h-3.5 w-3.5" />
              </div>
              <div className="font-mono text-lg font-bold text-emerald-300 text-glow">{systemFrequency.hz.toFixed(3)} <span className="text-[10px] font-medium text-muted-foreground">Hz</span></div>
            </div>
          )}

          {storage && (
            <div className={`rounded-xl border px-3 py-2.5 ${storageTone}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex items-center gap-1.5"><BatteryCharging className="h-3.5 w-3.5" />Pumped storage</span>
                <HelpTooltip content="Pumped-storage status from Elexon/BMRS PS data. Negative values mean charging/pumping; positive values mean generating." className="h-3.5 w-3.5" />
              </div>
              <div className="font-mono text-lg font-bold text-glow">{formatGWfromMW(storage.absMW)} <span className="text-[10px] font-medium text-muted-foreground">GW</span></div>
            </div>
          )}
        </div>
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
