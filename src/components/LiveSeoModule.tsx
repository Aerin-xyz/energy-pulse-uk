import { Link } from 'react-router-dom';
import { useEnergyData } from '@/contexts/EnergyDataContext';
import { useGridSignals } from '@/hooks/useGridSignals';

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
type ForecastPoint = { from: string; to: string; intensity?: { forecast?: number | null; actual?: number | null; index?: string } };

const fmtGW = (mw?: number | null) => {
  const value = Number(mw || 0);
  if (!Number.isFinite(value) || value <= 0) return '0.0 GW';
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} GW`;
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return 'soon';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'soon';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const pct = (part: number, total: number) => total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0.0%';
const fmtPrice = (price?: number | null) => Number.isFinite(price) ? `£${Number(price).toFixed(2)}/MWh` : 'Checking…';

function getMixValue(mix: GenerationItem[], names: string[]) {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  return mix.reduce((sum, item) => wanted.has(item.name.toLowerCase()) ? sum + Number(item.value || 0) : sum, 0);
}

function bestCleanWindow(forecast?: ForecastPoint[]) {
  const now = Date.now();
  return (forecast || [])
    .filter((point) => new Date(point.to).getTime() >= now)
    .map((point) => ({ ...point, value: Number(point.intensity?.forecast ?? point.intensity?.actual) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.value - b.value)[0];
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
    title: 'Cleanest window today',
    description: 'Uses the carbon-intensity forecast to identify the next low-carbon electricity window for flexible use.',
  },
};

export function LiveSeoModule({ focus = 'mix' }: { focus?: Focus }) {
  const { data, loading, error } = useEnergyData();
  const mix = data?.generationMix || [];
  const totalMix = mix.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const wind = getMixValue(mix, ['Wind']);
  const solar = getMixValue(mix, ['Solar']);
  const hydro = getMixValue(mix, ['Hydro']);
  const biomass = getMixValue(mix, ['Biomass']);
  const nuclear = getMixValue(mix, ['Nuclear']);
  const gas = getMixValue(mix, ['Gas']);
  const renewables = wind + solar + hydro + biomass;
  const lowCarbon = renewables + nuclear;
  const imports = (data?.interconnectors || []).reduce((sum, ic) => sum + (ic.flow > 0 ? ic.flow : 0), 0);
  const exports = (data?.interconnectors || []).reduce((sum, ic) => sum + (ic.flow < 0 ? Math.abs(ic.flow) : 0), 0);
  const cleanWindow = bestCleanWindow(data?.carbonIntensity?.forecastData);
  const gridSignals = useGridSignals({
    marketIndexPrice: data?.marketIndexPrice || null,
    systemFrequency: data?.systemFrequency || null,
    storage: data?.storage || null,
  });
  const marketIndexPrice = data?.marketIndexPrice || gridSignals.marketIndexPrice;
  const storage = data?.storage || gridSignals.storage;
  const copy = focusCopy[focus];

  const cardsByFocus: Record<Focus, Array<{ label: string; value: string; note: string }>> = {
    mix: [
      { label: 'Demand', value: fmtGW(data?.totalDemandMW), note: 'GB grid demand' },
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'wind, solar, nuclear, hydro, biomass' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? data?.carbonIntensity?.forecast ?? '—'} gCO₂/kWh`, note: data?.carbonIntensity?.index || 'latest estimate' },
    ],
    carbon: [
      { label: 'Now', value: `${data?.carbonIntensity?.actual ?? data?.carbonIntensity?.forecast ?? '—'} gCO₂/kWh`, note: data?.carbonIntensity?.index || 'latest estimate' },
      { label: 'Best upcoming', value: cleanWindow ? `${cleanWindow.value} gCO₂/kWh` : 'Checking…', note: cleanWindow ? `${fmtTime(cleanWindow.from)}–${fmtTime(cleanWindow.to)}` : 'forecast window' },
      { label: 'Gas', value: fmtGW(gas), note: `${pct(gas, totalMix)} of visible mix` },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'current visible share' },
    ],
    renewables: [
      { label: 'Renewables', value: fmtGW(renewables), note: `${pct(renewables, totalMix)} of visible mix` },
      { label: 'Wind', value: fmtGW(wind), note: 'largest swing source' },
      { label: 'Solar', value: fmtGW(solar), note: 'daylight dependent' },
      { label: 'Hydro + biomass', value: fmtGW(hydro + biomass), note: 'smaller renewable sources' },
    ],
    gas: [
      { label: 'Gas', value: fmtGW(gas), note: `${pct(gas, totalMix)} of visible mix` },
      { label: 'Demand', value: fmtGW(data?.totalDemandMW), note: 'demand pressure' },
      { label: 'Renewables', value: pct(renewables, totalMix), note: 'renewable share' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? data?.carbonIntensity?.forecast ?? '—'} gCO₂/kWh`, note: data?.carbonIntensity?.index || 'latest estimate' },
    ],
    nuclear: [
      { label: 'Nuclear', value: fmtGW(nuclear), note: `${pct(nuclear, totalMix)} of visible mix` },
      { label: 'Low-carbon', value: pct(lowCarbon, totalMix), note: 'including nuclear' },
      { label: 'Demand', value: fmtGW(data?.totalDemandMW), note: 'current grid demand' },
      { label: 'Carbon', value: `${data?.carbonIntensity?.actual ?? data?.carbonIntensity?.forecast ?? '—'} gCO₂/kWh`, note: data?.carbonIntensity?.index || 'latest estimate' },
    ],
    interconnectors: [
      { label: 'Imports', value: fmtGW(imports), note: 'positive interconnector flow' },
      { label: 'Exports', value: fmtGW(exports), note: 'outbound interconnector flow' },
      { label: 'Net transfer', value: fmtGW(Math.max(imports - exports, 0)), note: imports >= exports ? 'net import' : 'net export' },
      { label: 'Links tracked', value: `${data?.interconnectors?.length || 0}`, note: data?.dataFreshness?.interconnectorStatus || 'status unknown' },
    ],
    demand: [
      { label: 'Demand', value: fmtGW(data?.totalDemandMW), note: 'GB transmission demand' },
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Net imports', value: fmtGW(Math.max(imports - exports, 0)), note: 'transfer contribution' },
      { label: storage?.mode === 'charging' ? 'Storage charging' : 'Storage output', value: fmtGW(storage?.absMW), note: storage?.label || 'pumped storage status' },
    ],
    generation: [
      { label: 'Generation', value: fmtGW(data?.totalGenerationMW), note: 'domestic generation' },
      { label: 'Wind + solar', value: fmtGW(wind + solar), note: `${pct(wind + solar, totalMix)} of visible mix` },
      { label: 'Gas', value: fmtGW(gas), note: 'flexible fossil generation' },
      { label: 'Nuclear', value: fmtGW(nuclear), note: 'steady low-carbon output' },
    ],
    cleanest: [
      { label: 'Best upcoming', value: cleanWindow ? `${cleanWindow.value} gCO₂/kWh` : 'Checking…', note: cleanWindow ? `${fmtTime(cleanWindow.from)}–${fmtTime(cleanWindow.to)}` : 'forecast window' },
      { label: 'Now', value: `${data?.carbonIntensity?.actual ?? data?.carbonIntensity?.forecast ?? '—'} gCO₂/kWh`, note: data?.carbonIntensity?.index || 'latest estimate' },
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
        <p className="text-sm text-foreground/60">{data?.asOf?.endISO ? `As of ${fmtTime(data.asOf.endISO)}` : loading ? 'Loading live data…' : 'Latest available'}</p>
      </div>

      <p className="text-foreground/80 mb-5">{copy.description}</p>

      {error && <p className="text-sm text-amber-300 mb-4">Live data is temporarily unavailable, so this page is showing explanatory content only.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cardsByFocus[focus].map((card) => (
          <div key={card.label} className="rounded-lg border border-primary/15 bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-foreground/50">{card.label}</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{card.value}</p>
            <p className="text-xs text-foreground/55 mt-1">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <Link to="/power-flow" className="text-cosmic-cyan hover:underline">Open live Power Flow</Link>
        <Link to="/data" className="text-cosmic-cyan hover:underline">Data sources</Link>
        <Link to="/methodology" className="text-cosmic-cyan hover:underline">Methodology</Link>
      </div>
    </section>
  );
}
