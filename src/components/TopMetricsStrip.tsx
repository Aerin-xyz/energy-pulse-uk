import { Activity, ArrowLeftRight, BatteryCharging, Factory, Gauge, Leaf, PoundSterling, RadioTower } from 'lucide-react';
import { formatGWfromMW } from '@/lib/utils';
import { HelpTooltip } from '@/components/HelpTooltip';

interface TopMetricsStripProps {
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

const metricClass = 'glass-morphism rounded-xl border border-primary/20 px-3 py-3 md:px-4';

const storageTone = (mode?: string) => {
  if (mode === 'charging') return 'text-sky-300';
  if (mode === 'generating') return 'text-emerald-300';
  return 'text-muted-foreground';
};

export const TopMetricsStrip = ({
  totalDemandMW,
  totalGenerationMW,
  interconnectorFlowMW,
  carbonIntensity,
  marketIndexPrice,
  systemFrequency,
  storage,
}: TopMetricsStripProps) => {
  const transferLabel = interconnectorFlowMW >= 0 ? 'Net imports' : 'Net exports';
  const transferValue = Math.abs(interconnectorFlowMW);

  const metrics = [
    {
      label: 'Displayed demand',
      value: `${formatGWfromMW(totalDemandMW)} GW`,
      icon: Gauge,
      tone: 'text-foreground',
      help: 'Consumer-facing GB demand derived from live power balance: GB production + net imports/exports + pumped-storage transfer. This is intentionally different from raw BMRS transmission demand.',
    },
    {
      label: 'GB production',
      value: `${formatGWfromMW(totalGenerationMW)} GW`,
      icon: Factory,
      tone: 'text-cosmic-cyan',
      help: 'Domestic Great Britain electricity production, including embedded wind/solar estimates where available and excluding imports.',
    },
    {
      label: transferLabel,
      value: `${formatGWfromMW(transferValue)} GW`,
      icon: ArrowLeftRight,
      tone: interconnectorFlowMW >= 0 ? 'text-primary' : 'text-orange-300',
      help: 'Net interconnector transfer. Positive values mean electricity is importing into GB; negative values mean exporting from GB.',
    },
    {
      label: 'Carbon',
      value: carbonIntensity ? `${carbonIntensity.actual} gCO₂/kWh` : 'Unknown',
      icon: Leaf,
      tone: carbonIntensity?.index?.toLowerCase().includes('low') ? 'text-carbon-low' : 'text-carbon-moderate',
      help: `Carbon Intensity API value${carbonIntensity?.index ? ` — ${carbonIntensity.index}` : ''}.`,
    },
    ...(marketIndexPrice ? [{
      label: 'Market price',
      value: `£${marketIndexPrice.priceGBPPerMWh.toFixed(2)}/MWh`,
      icon: PoundSterling,
      tone: 'text-amber-300',
      help: 'Elexon Market Index Price, volume-weighted across available market index data providers for the latest settlement period. This is wholesale market context, not a consumer tariff.',
    }] : []),
    ...(systemFrequency ? [{
      label: 'Frequency',
      value: `${systemFrequency.hz.toFixed(3)} Hz`,
      icon: RadioTower,
      tone: systemFrequency.status === 'normal' ? 'text-emerald-300' : 'text-orange-300',
      help: 'GB system frequency from Elexon FREQ data. The grid targets 50 Hz; small deviations are normal.',
    }] : []),
    ...(storage ? [{
      label: storage.mode === 'charging' ? 'Storage charging' : storage.mode === 'generating' ? 'Storage output' : 'Storage',
      value: `${formatGWfromMW(storage.absMW)} GW`,
      icon: BatteryCharging,
      tone: storageTone(storage.mode),
      help: storage.label || 'Pumped storage status from Elexon FUELINST/BMRS PS data. Negative values mean charging/pumping; positive values mean generating.',
    }] : []),
  ];

  return (
    <section className="hidden md:block border-b border-primary/20 bg-background/40 relative">
      <div className="container mx-auto px-3 py-3 md:px-4 lg:px-6">
        <div className="grid gap-2.5 md:gap-3 [grid-template-columns:repeat(auto-fit,minmax(132px,1fr))]">
          {metrics.map(({ label, value, icon: Icon, tone, help }) => (
            <div key={label} className={metricClass}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground uppercase tracking-wide">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </div>
                <HelpTooltip content={help} className="w-3.5 h-3.5" />
              </div>
              <div className={`font-bold text-lg md:text-xl ${tone} text-glow`}>
                {value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Activity className="w-3 h-3 text-green-400" />
          <span>Page refreshes every 2 minutes; live sources update at their native cadence, typically 5–30 minutes by dataset.</span>
        </div>
      </div>
    </section>
  );
};
