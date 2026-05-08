import { Activity, ArrowLeftRight, Clock, Factory, Gauge, Leaf } from 'lucide-react';
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
  lastLivePoint?: string | null;
}

const formatTime = (iso?: string | null) => {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const metricClass = 'glass-morphism rounded-xl border border-primary/20 px-3 py-3 md:px-4';

export const TopMetricsStrip = ({
  totalDemandMW,
  totalGenerationMW,
  interconnectorFlowMW,
  carbonIntensity,
  lastLivePoint,
}: TopMetricsStripProps) => {
  const transferLabel = interconnectorFlowMW >= 0 ? 'Net imports' : 'Net exports';
  const transferValue = Math.abs(interconnectorFlowMW);

  const metrics = [
    {
      label: 'Demand',
      value: `${formatGWfromMW(totalDemandMW)} GW`,
      icon: Gauge,
      tone: 'text-foreground',
      help: 'Total GB transmission system demand from BMRS ITSDO where available.',
    },
    {
      label: 'Generation',
      value: `${formatGWfromMW(totalGenerationMW)} GW`,
      icon: Factory,
      tone: 'text-cosmic-cyan',
      help: 'Domestic GB generation. Fast path uses Elexon FUELINST where available.',
    },
    {
      label: transferLabel,
      value: `${formatGWfromMW(transferValue)} GW`,
      icon: ArrowLeftRight,
      tone: interconnectorFlowMW >= 0 ? 'text-primary' : 'text-orange-300',
      help: 'Net interconnector flow. Positive values mean GB is importing electricity; negative values mean exporting.',
    },
    {
      label: 'Carbon',
      value: carbonIntensity ? `${carbonIntensity.actual} gCO₂/kWh` : 'Unknown',
      icon: Leaf,
      tone: carbonIntensity?.index?.toLowerCase().includes('low') ? 'text-carbon-low' : 'text-carbon-moderate',
      help: `Carbon Intensity API value${carbonIntensity?.index ? ` — ${carbonIntensity.index}` : ''}.`,
    },
    {
      label: 'Last live point',
      value: formatTime(lastLivePoint),
      icon: Clock,
      tone: 'text-cosmic-cyan',
      help: 'Timestamp of the freshest upstream live generation datapoint, not just the page refresh time.',
    },
  ];

  return (
    <section className="border-b border-primary/20 bg-background/40 relative">
      <div className="container mx-auto px-3 py-3 md:px-4 lg:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 md:gap-3">
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
          <span>Auto-refreshing every 2 minutes; primary generation source cadence is 5 minutes.</span>
        </div>
      </div>
    </section>
  );
};
