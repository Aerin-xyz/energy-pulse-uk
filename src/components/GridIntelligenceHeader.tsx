import { Activity, ArrowDownUp, BatteryCharging, Factory, Gauge, Leaf, PoundSterling, RadioTower, Sparkles, Wind } from 'lucide-react';
import { HelpTooltip } from '@/components/HelpTooltip';
import { formatGWfromMW } from '@/lib/utils';

interface GenerationData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface InterconnectorData {
  name: string;
  country: string;
  flow: number;
  capacity: number;
}

interface GridIntelligenceHeaderProps {
  generationMix: GenerationData[];
  interconnectors: InterconnectorData[];
  totalGenerationMW: number;
  totalDemandMW: number;
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
  dataAge?: string;
}

const valueFor = (mix: GenerationData[], names: string[]) =>
  mix
    .filter((item) => names.some((name) => item.name.toLowerCase().includes(name.toLowerCase())))
    .reduce((sum, item) => sum + item.value, 0);

const percentage = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);

const toneClasses = {
  calm: 'border-emerald-300/20 bg-emerald-300/7 text-emerald-200',
  cyan: 'border-cosmic-cyan/25 bg-cosmic-cyan/7 text-cosmic-cyan',
  amber: 'border-amber-300/25 bg-amber-300/7 text-amber-200',
  rose: 'border-rose-300/25 bg-rose-300/7 text-rose-200',
  muted: 'border-primary/15 bg-white/[0.03] text-foreground/80',
};

const carbonSignal = (actual?: number) => {
  if (!Number.isFinite(actual)) return { label: 'Unknown', tone: 'muted' as const };
  if ((actual || 0) < 100) return { label: 'Low carbon', tone: 'calm' as const };
  if ((actual || 0) < 180) return { label: 'Moderate', tone: 'cyan' as const };
  if ((actual || 0) < 260) return { label: 'Carbon elevated', tone: 'amber' as const };
  return { label: 'High carbon', tone: 'rose' as const };
};

const priceSignal = (price?: number) => {
  if (!Number.isFinite(price)) return { label: 'Awaiting price', tone: 'muted' as const };
  if ((price || 0) < 60) return { label: 'Cheap', tone: 'calm' as const };
  if ((price || 0) < 120) return { label: 'Normal', tone: 'cyan' as const };
  if ((price || 0) < 180) return { label: 'Elevated', tone: 'amber' as const };
  return { label: 'Expensive', tone: 'rose' as const };
};

const frequencySignal = (hz?: number, status?: string) => {
  if (!Number.isFinite(hz)) return { label: 'Awaiting frequency', tone: 'muted' as const };
  if (status === 'normal' || Math.abs((hz || 50) - 50) < 0.08) return { label: 'Stable', tone: 'calm' as const };
  if (Math.abs((hz || 50) - 50) < 0.15) return { label: 'Watch', tone: 'amber' as const };
  return { label: 'Stressed', tone: 'rose' as const };
};

const importSignal = (netMW: number) => {
  const absGW = Math.abs(netMW) / 1000;
  if (absGW < 0.5) return { label: 'Balanced', tone: 'muted' as const };
  if (netMW > 0 && absGW >= 4) return { label: 'Heavy imports', tone: 'amber' as const };
  if (netMW > 0) return { label: 'Importing', tone: 'cyan' as const };
  return { label: 'Exporting', tone: 'calm' as const };
};

export const GridIntelligenceHeader = ({
  generationMix,
  interconnectors,
  totalGenerationMW,
  totalDemandMW,
  carbonIntensity,
  marketIndexPrice,
  systemFrequency,
  storage,
  dataAge,
}: GridIntelligenceHeaderProps) => {
  const windMW = valueFor(generationMix, ['Wind']);
  const solarMW = valueFor(generationMix, ['Solar']);
  const gasMW = valueFor(generationMix, ['Gas']);
  const nuclearMW = valueFor(generationMix, ['Nuclear']);
  const renewablesMW = valueFor(generationMix, ['Wind', 'Solar', 'Hydro', 'PSH']);
  const lowCarbonMW = renewablesMW + nuclearMW + valueFor(generationMix, ['Biomass']);
  const netInterconnectorMW = interconnectors.reduce((sum, item) => sum + (item.flow || 0), 0);

  const dominant = [...generationMix]
    .filter((item) => item.value > 0 && !item.name.toLowerCase().includes('import'))
    .sort((a, b) => b.value - a.value)[0];

  const carbon = carbonSignal(carbonIntensity?.actual);
  const price = priceSignal(marketIndexPrice?.priceGBPPerMWh);
  const frequency = frequencySignal(systemFrequency?.hz, systemFrequency?.status);
  const transfers = importSignal(netInterconnectorMW);
  const windShare = percentage(windMW, totalGenerationMW);
  const renewableShare = percentage(renewablesMW, totalGenerationMW);
  const lowCarbonShare = percentage(lowCarbonMW, totalGenerationMW);
  const fossilShare = percentage(gasMW, totalGenerationMW);

  const windLabel = windShare >= 35 ? 'Wind carrying' : windShare >= 18 ? 'Useful wind' : 'Light wind';
  const storageLabel = storage?.mode === 'charging'
    ? 'Storage charging'
    : storage?.mode === 'generating'
      ? 'Storage helping'
      : 'Storage quiet';

  const sourceSentence = dominant
    ? `Right now, ${dominant.name.toLowerCase()} is the largest source.`
    : 'Right now, live generation is updating.';
  const carbonSentence = carbon.label === 'Low carbon'
    ? 'Carbon is low'
    : carbon.label === 'Unknown'
      ? 'Carbon is updating'
      : `Carbon is ${carbon.label.toLowerCase()}`;
  const transferSentence = transfers.label === 'Balanced'
    ? 'transfers are balanced'
    : transfers.label === 'Exporting'
      ? 'Britain is exporting power'
      : transfers.label === 'Heavy imports'
        ? 'imports are high'
        : 'imports are supporting demand';
  const priceSentence = price.label !== 'Awaiting price'
    ? `wholesale prices are ${price.label.toLowerCase()}`
    : null;
  const marketSentence = [carbonSentence, transferSentence, priceSentence].filter(Boolean).join(', ');

  const summary = `${sourceSentence} ${marketSentence}. Demand is about ${formatGWfromMW(totalDemandMW)}GW; frequency is ${frequency.label.toLowerCase()}.`;

  const tape = [
    { label: 'GB power', value: `${formatGWfromMW(totalGenerationMW)}GW`, signal: 'Live', icon: Factory, tone: 'cyan' as const },
    { label: 'Carbon', value: carbonIntensity ? `${carbonIntensity.actual}g` : '—', signal: carbon.label, icon: Leaf, tone: carbon.tone },
    { label: 'Wind', value: `${formatGWfromMW(windMW)}GW`, signal: windLabel, icon: Wind, tone: windShare >= 35 ? 'calm' as const : 'muted' as const },
    { label: 'Imports', value: `${netInterconnectorMW >= 0 ? '+' : ''}${formatGWfromMW(netInterconnectorMW)}GW`, signal: transfers.label, icon: ArrowDownUp, tone: transfers.tone },
    ...(marketIndexPrice ? [{ label: 'Wholesale', value: `£${Math.round(marketIndexPrice.priceGBPPerMWh)}/MWh`, signal: price.label, icon: PoundSterling, tone: price.tone }] : []),
    ...(systemFrequency ? [{ label: 'Frequency', value: `${systemFrequency.hz.toFixed(2)}Hz`, signal: frequency.label, icon: RadioTower, tone: frequency.tone }] : []),
    ...(storage ? [{ label: 'Storage', value: `${formatGWfromMW(storage.absMW)}GW`, signal: storageLabel, icon: BatteryCharging, tone: storage.mode === 'generating' ? 'calm' as const : storage.mode === 'charging' ? 'cyan' as const : 'muted' as const }] : []),
  ];

  const signalCards = [
    {
      label: 'Cleanliness',
      value: `${lowCarbonShare.toFixed(0)}%`,
      caption: 'low-carbon domestic generation',
      tone: carbon.tone,
      help: 'Low-carbon share includes wind, solar, hydro, pumped storage, nuclear and biomass in the domestic generation mix.',
    },
    {
      label: 'Renewables',
      value: `${renewableShare.toFixed(0)}%`,
      caption: 'wind, solar, hydro and PSH',
      tone: renewableShare >= 45 ? 'calm' as const : renewableShare >= 25 ? 'cyan' as const : 'muted' as const,
      help: 'Renewables are calculated from the live generation mix and exclude imports.',
    },
    {
      label: 'Gas reliance',
      value: `${fossilShare.toFixed(0)}%`,
      caption: 'gas share of production',
      tone: fossilShare <= 20 ? 'calm' as const : fossilShare <= 40 ? 'amber' as const : 'rose' as const,
      help: 'Gas share is a simple live indicator of fossil-fuel reliance in domestic generation.',
    },
  ];

  return (
    <section className="relative border-b border-primary/20 bg-background/55 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-25 pointer-events-none" />
      <div className="container relative z-10 mx-auto px-4 py-4 md:px-6 md:py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cosmic-cyan/80">Live grid intelligence</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground md:text-2xl">Britain’s electricity system, decoded</h2>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-background/45 px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <Activity className="h-3.5 w-3.5 text-emerald-300" />
            <span>{dataAge ? `${dataAge} min old` : 'Live source cadence'}</span>
          </div>
        </div>

        <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
          <div className="flex min-w-max gap-2 md:grid md:min-w-0 md:grid-cols-4 lg:grid-cols-7">
            {tape.map(({ label, value, signal, icon: Icon, tone }) => (
              <div key={label} className={`rounded-2xl border px-3 py-2.5 backdrop-blur-md ${toneClasses[tone]}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] opacity-80">
                  <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>
                </div>
                <div className="text-lg font-bold leading-tight text-glow md:text-xl">{value}</div>
                <div className="mt-1 text-[11px] text-foreground/65">{signal}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
          <div className="rounded-3xl border border-primary/20 bg-card/55 p-4 shadow-xl shadow-primary/5 md:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary/80">
              <Sparkles className="h-4 w-4" />
              Now
            </div>
            <p className="text-xl font-semibold leading-snug text-foreground md:text-2xl">{summary}</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              The live view below shows how generation, imports, storage and demand are balancing in near real time. Values refresh from public grid sources at their native cadence.
            </p>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-1">
            {signalCards.map(({ label, value, caption, tone, help }) => (
              <div key={label} className={`min-w-[178px] rounded-2xl border p-3 sm:min-w-0 ${toneClasses[tone]}`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.18em] opacity-80">
                  <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{label}</span>
                  <HelpTooltip content={help} className="h-3.5 w-3.5" />
                </div>
                <div className="text-2xl font-bold text-glow">{value}</div>
                <div className="text-xs text-foreground/65">{caption}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
