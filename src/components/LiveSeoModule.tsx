import { Link } from 'react-router-dom';
import { useEnergyData } from '@/contexts/EnergyDataContext';
import { useGridSignals } from '@/hooks/useGridSignals';
import { useEffect, useState } from 'react';
import { StaticGridSnapshot } from '@/components/StaticGridSnapshot';
import { finite, forecastWindowState, transfers, sourceState } from '@/lib/gridMetrics.mjs';
import { carbonPresentation } from '@/lib/evidence/carbon.mjs';
import { londonTimestamp } from '@/lib/evidence/timeLabels.mjs';

type Focus =
  | 'mix'
  | 'carbon'
  | 'renewables'
  | 'gas'
  | 'nuclear'
  | 'interconnectors'
  | 'demand'
  | 'generation'
  | 'cleanest';

type GenerationItem = { name: string; value: number; percentage?: number };
const fmtGW = (mw?: number | null) => {
  if (!finite(mw)) return '— GW';
  const value = mw!;
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} GW`;
};

const fmtTime = (iso?: string | null) => {
  return londonTimestamp(iso);
};

const pct = (part: number | null, total: number | null) => finite(part) && finite(total) && total! > 0 ? `${((part! / total!) * 100).toFixed(1)}%` : '—';
const fmtPrice = (price?: number | null) => Number.isFinite(price) ? `£${Number(price).toFixed(2)}/MWh` : 'Unavailable';
const sumKnown = (...values: Array<number | null>) => values.every(finite) ? values.reduce((sum, value) => sum + value!, 0) : null;

function getMixValue(mix: GenerationItem[], names: string[]) {
  const values = names.map(name => mix.find(item => item.name.toLowerCase() === name.toLowerCase())?.value);
  return values.every(finite) ? values.reduce((sum, value) => sum + value!, 0) : null;
}

const focusCopy: Record<Focus, { title: string; description: string }> = {
  mix: {
    title: 'Live mix snapshot',
    description: 'Current Great Britain electricity mix from public grid data, grouped into the sources people actually search for.',
  },
  carbon: {
    title: 'Carbon intensity now',
    description: 'A practical read on how clean the grid is and what is likely to drive the next cleaner window.',
  },
  renewables: {
    title: 'Renewables now',
    description: 'Wind, solar, hydro and biomass contribution, shown beside demand so the share is easy to interpret.',
  },
  gas: {
    title: 'Gas generation now',
    description: 'Gas output in context: demand, renewables and imports usually explain why it is rising or falling.',
  },
  nuclear: {
    title: 'Nuclear output now',
    description: 'Britain’s steadier low-carbon source, useful as a baseline against more variable wind and solar.',
  },
  interconnectors: {
    title: 'Imports and exports now',
    description: 'Live interconnector flows summarised as imports, exports and net transfer into Great Britain.',
  },
  demand: {
    title: 'Demand now',
    description: 'Current grid demand, generation and transfers shown together to explain the live balance.',
  },
  generation: {
    title: 'Generation by source now',
    description: 'Live source-level generation, including wind, solar, gas, nuclear, hydro, biomass, imports and other sources.',
  },
  cleanest: {
    title: 'Lowest-carbon 2-hour forecast window',
    description: 'Uses the carbon-intensity forecast to identify the next low-carbon electricity window for flexible use.',
  },
};

export function LiveSeoModule({ focus = 'mix' }: { focus?: Focus }) {
  const { data, loading, error } = useEnergyData();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const mix = data?.generationMix || [];
  const totalMix = data?.totalGenerationMW ?? null;
  const wind = getMixValue(mix, ['Wind']);
  const solar = getMixValue(mix, ['Solar']);
  const hydro = getMixValue(mix, ['Hydro']);
  const biomass = getMixValue(mix, ['Biomass']);
  const nuclear = getMixValue(mix, ['Nuclear']);
  const gas = getMixValue(mix, ['Gas']);
  const renewables = sumKnown(wind, solar, hydro, biomass);
  const lowCarbon = sumKnown(renewables, nuclear);
  const { imports, exports, net } = transfers(data?.interconnectors);
  const outlook = forecastWindowState(data?.carbonIntensity?.forecastData, 120, now);
  const cleanWindow = outlook.window;
  const carbon = carbonPresentation(data?.carbonIntensity, now);
  const carbonNote = `${carbon.basis} · ${londonTimestamp(data?.carbonIntensity?.intervalFrom)}–${londonTimestamp(data?.carbonIntensity?.intervalTo)} · ${carbon.freshness}`;
  const gridSignals = useGridSignals({
    marketIndexPrice: data?.marketIndexPrice || null,
    systemFrequency: data?.systemFrequency || null,
    storage: data?.storage || null,
  });
  const marketIndexPrice = data?.marketIndexPrice || gridSignals.marketIndexPrice;
  const storage = data?.storage || gridSignals.storage;
  const displayDemandMW = data?.totalDemandMW;
  const copy = focusCopy[focus];
  if (!data) return <StaticGridSnapshot compact />;

  const cardsByFocus: Record<Focus, Array<{ label: string; value: string; note: string }>> = {
    mix: [
      { label: 'Demand', value: fmtGW(displayDemandMW), note: 'GB grid demand' },
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'wind, solar, nuclear, hydro, biomass' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? '—'} gCO₂/kWh`, note: carbonNote },
    ],
    carbon: [
      { label: 'Now', value: `${data?.carbonIntensity?.actual ?? '—'} gCO₂/kWh`, note: carbonNote },
      { label: 'Best upcoming', value: cleanWindow ? `${Math.round(cleanWindow.intensity)} gCO₂/kWh` : 'Unavailable', note: cleanWindow ? `2-hour forecast mean · ${fmtTime(cleanWindow.from)}–${fmtTime(cleanWindow.to)}` : outlook.reason },
      { label: 'Gas', value: fmtGW(gas), note: `${pct(gas, totalMix)} of domestic generation` },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'current visible share' },
    ],
    renewables: [
      { label: 'Renewables', value: fmtGW(renewables), note: `${pct(renewables, totalMix)} of domestic generation` },
      { label: 'Wind', value: fmtGW(wind), note: 'largest swing source' },
      { label: 'Solar', value: fmtGW(solar), note: 'daylight dependent' },
      { label: 'Hydro + biomass', value: fmtGW(sumKnown(hydro, biomass)), note: 'smaller renewable sources' },
    ],
    gas: [
      { label: 'Gas', value: fmtGW(gas), note: `${pct(gas, totalMix)} of domestic generation` },
      { label: 'Demand', value: fmtGW(displayDemandMW), note: 'demand pressure' },
      { label: 'Renewables', value: pct(renewables, totalMix), note: 'renewable share' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? '—'} gCO₂/kWh`, note: carbonNote },
    ],
    nuclear: [
      { label: 'Nuclear', value: fmtGW(nuclear), note: `${pct(nuclear, totalMix)} of domestic generation` },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'including nuclear' },
      { label: 'Demand', value: fmtGW(displayDemandMW), note: 'current grid demand' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? '—'} gCO₂/kWh`, note: carbonNote },
    ],
    interconnectors: [
      { label: 'Imports', value: fmtGW(imports), note: 'positive interconnector flow' },
      { label: 'Exports', value: fmtGW(exports), note: 'outbound interconnector flow' },
      { label: 'Net transfer', value: fmtGW(net), note: finite(net) ? net > 0 ? 'net import' : net < 0 ? 'net export' : 'balanced' : 'Reading unavailable' },
      { label: 'Links tracked', value: `${data?.interconnectors?.length || '—'}`, note: data?.dataFreshness?.interconnectorStatus || 'status unknown' },
    ],
    demand: [
      { label: 'Demand', value: fmtGW(displayDemandMW), note: 'reported GB demand; source boundaries differ' },
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Net imports', value: fmtGW(net), note: 'transfer contribution' },
      { label: storage?.mode === 'charging' ? 'Storage charging' : 'Storage output', value: fmtGW(storage?.absMW), note: storage?.label || 'pumped storage status' },
    ],
    generation: [
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Wind + solar', value: fmtGW(sumKnown(wind, solar)), note: `${pct(sumKnown(wind, solar), totalMix)} of domestic generation` },
      { label: 'Gas', value: fmtGW(gas), note: 'flexible fossil generation' },
      { label: 'Nuclear', value: fmtGW(nuclear), note: 'steady low-carbon output' },
    ],
    cleanest: [
      { label: 'Best upcoming', value: cleanWindow ? `${Math.round(cleanWindow.intensity)} gCO₂/kWh` : 'Unavailable', note: cleanWindow ? `2-hour forecast mean · ${fmtTime(cleanWindow.from)}–${fmtTime(cleanWindow.to)}` : outlook.reason },
      { label: 'Now', value: `${data?.carbonIntensity?.actual ?? '—'} gCO₂/kWh`, note: carbonNote },
      { label: 'Market price', value: fmtPrice(marketIndexPrice?.priceGBPPerMWh), note: 'wholesale context, not tariff' },
      { label: storage?.mode === 'charging' ? 'Storage charging' : 'Storage output', value: fmtGW(storage?.absMW), note: storage?.label || 'pumped storage status' },
    ],
  };

  return (
    <section className="rounded-xl border border-cosmic-cyan/25 bg-cosmic-cyan/5 p-5 md:p-6 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cosmic-cyan/80">Live data module</p>
          <h2 className="text-2xl font-semibold text-primary mt-1">{copy.title}</h2>
        </div>
        <p className="text-sm text-foreground/60">{data?.asOf?.endISO ? `Generation interval ended ${fmtTime(data.asOf.endISO)} · ${sourceState(data.asOf.endISO,30,now).label}` : loading ? 'Loading live data…' : 'Latest available'}</p>
      </div>

      <p className="text-foreground/80 mb-5">{copy.description}</p>

      {error && <p className="text-sm text-amber-300 mb-4">Live refresh is temporarily unavailable. Retained readings keep their original source periods.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cardsByFocus[focus].map((card) => (
          <div key={card.label} className="rounded-lg border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{card.label}</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{card.value}</p>
            <p className="text-xs text-foreground/55 mt-1">{card.note}</p>
          </div>
        ))}
      </div>

      {(focus === 'carbon' || focus === 'cleanest') && <p className="mt-4 text-sm">Forecast horizon: {outlook.horizon ? `${fmtTime(outlook.horizon.from)}–${fmtTime(outlook.horizon.to)}` : 'unavailable'}. Only contiguous future periods qualify. Duration-weighted average; equal values choose the earliest start. Source issue time is not supplied.</p>}
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link to="/power-flow" className="text-cosmic-cyan hover:underline">Open live Power Flow</Link>
        <Link to="/data" className="text-cosmic-cyan hover:underline">Data sources</Link>
        <Link to="/methodology" className="text-cosmic-cyan hover:underline">Methodology</Link>
      </div>
    </section>
  );
}
