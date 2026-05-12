import { BatteryCharging, PoundSterling, RadioTower } from 'lucide-react';
import { formatGWfromMW } from '@/lib/utils';
import { HelpTooltip } from '@/components/HelpTooltip';
import { useGridSignals, type MarketIndexPrice, type StorageStatus, type SystemFrequency } from '@/hooks/useGridSignals';

interface GridSignalsPanelProps {
  marketIndexPrice?: MarketIndexPrice | null;
  systemFrequency?: SystemFrequency | null;
  storage?: StorageStatus | null;
}

const formatTime = (iso?: string) => {
  if (!iso) return 'latest period';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'latest period';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const storageTone = (mode?: string) => {
  if (mode === 'charging') return 'text-sky-300';
  if (mode === 'generating') return 'text-emerald-300';
  return 'text-muted-foreground';
};

export function GridSignalsPanel({ marketIndexPrice, systemFrequency, storage }: GridSignalsPanelProps) {
  const signals = useGridSignals({ marketIndexPrice, systemFrequency, storage });
  const price = marketIndexPrice || signals.marketIndexPrice;
  const frequency = systemFrequency || signals.systemFrequency;
  const storageSignal = storage || signals.storage;
  const cards = [price, frequency, storageSignal].filter(Boolean).length;

  if (!cards) return null;

  return (
    <section className="glass-morphism rounded-2xl border border-primary/20 p-4 md:p-5 shadow-[0_0_30px_rgba(28,222,228,0.08)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cosmic-cyan/80">Live grid signals</p>
          <h2 className="text-lg md:text-xl font-semibold text-foreground mt-1">Price, frequency and storage</h2>
        </div>
        <HelpTooltip content="These signals add market and grid-health context to the generation mix: wholesale market index price, GB system frequency and pumped-storage status." className="w-4 h-4 mt-1" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {price && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
            <PoundSterling className="w-4 h-4 text-amber-300" />
            <span>Market price</span>
          </div>
          <div className="font-mono text-2xl font-bold text-amber-300">
            £{price.priceGBPPerMWh.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">per MWh wholesale • {formatTime(price.startTime)}</p>
        </div>}

        {frequency && <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
            <RadioTower className="w-4 h-4 text-emerald-300" />
            <span>Frequency</span>
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-300">
            {frequency.hz.toFixed(3)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Hz, target 50.000</p>
        </div>}

        {storageSignal && <div className="rounded-xl border border-sky-300/20 bg-sky-300/5 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
            <BatteryCharging className={`w-4 h-4 ${storageTone(storageSignal?.mode)}`} />
            <span>Pumped storage</span>
          </div>
          <div className={`font-mono text-2xl font-bold ${storageTone(storageSignal?.mode)}`}>
            {formatGWfromMW(storageSignal.absMW)} GW
          </div>
          <p className="text-xs text-muted-foreground mt-1">{storageSignal.label || 'Latest Elexon PS status'}</p>
        </div>}
      </div>
    </section>
  );
}
