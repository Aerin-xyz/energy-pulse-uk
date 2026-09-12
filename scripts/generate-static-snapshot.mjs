import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { supplyBalance, transfers, RENEWABLE_FUELS, fuelValue, DEFINITION_VERSION } from '../src/lib/gridMetrics.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'src/data/staticGridSnapshot.json');

const endpoint = `https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/energy-data?debug=1&updateType=full&t=${Date.now()}`;

const fmtGW = (mw) => typeof mw === 'number' && Number.isFinite(mw) ? `${(mw / 1000).toFixed(1)} GW` : 'unavailable';
const fmtPct = (n) => typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)}%` : 'unavailable';
const isoOrNull = (value) => value ? new Date(value).toISOString() : null;

const valueFor = (mix, names) => {
  const wanted = names.map((name) => name.toLowerCase());
  return (mix || [])
    .filter((item) => wanted.includes(String(item.name || '').toLowerCase()))
    .reduce((sum, item) => sum + (Number(item.value) || 0), 0);
};

const pctOf = (part, total) => total > 0 ? (part / total) * 100 : null;

let snapshot;
try {
  const response = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (!response.ok) throw new Error(`energy-data failed ${response.status}`);
  const data = await response.json();
  const mix = Array.isArray(data.generationMix) ? data.generationMix : [];
  const totalGenerationMW = Number(data.totalGenerationMW) || mix.filter(item => !['Imports', 'PSH', 'Pumped Storage'].includes(item.name)).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const totalDemandMW = supplyBalance(data.totalGenerationMW, data.interconnectors, data.storage?.netMW);
  const windMW = valueFor(mix, ['Wind']);
  const solarMW = valueFor(mix, ['Solar']);
  const hydroMW = valueFor(mix, ['Hydro']);
  const biomassMW = valueFor(mix, ['Biomass']);
  const gasMW = valueFor(mix, ['Gas']);
  const nuclearMW = valueFor(mix, ['Nuclear']);
  const importsMW = valueFor(mix, ['Imports']);
  const exportsMW = (data.interconnectors || []).reduce((sum, item) => sum + Math.max(0, -(Number(item.flow) || 0)), 0);
  const renewablesMW = fuelValue(mix, RENEWABLE_FUELS);
  const renewableShare = pctOf(renewablesMW, totalGenerationMW);
  const gasShare = pctOf(gasMW, totalGenerationMW);
  const timestamp = isoOrNull(data.dataFreshness?.sourceFreshness?.generation?.timestamp);

  snapshot = {
    generatedAt: new Date().toISOString(),
    definitionVersion: DEFINITION_VERSION,
    sourceFreshness: data.dataFreshness?.sourceFreshness || {},
    timestamp,
    source: data.dataFreshness?.source || 'Elexon BMRS/FUELINST, NESO and Carbon Intensity API',
    status: 'snapshot',
    upstreamStatus: data.dataFreshness?.status || 'unknown',
    freshnessNote: data.dataFreshness?.note || data.dataFreshness?.variant || 'latest available public grid data at build time',
    metrics: {
      demandMW: totalDemandMW,
      generationMW: totalGenerationMW,
      carbonIntensity: data.carbonIntensity?.actual ?? data.carbonIntensity?.forecast ?? null,
      carbonIndex: data.carbonIntensity?.index || null,
      renewableShare,
      gasShare,
      windMW,
      solarMW,
      gasMW,
      nuclearMW,
      importsMW,
      exportsMW,
    },
    display: {
      demand: fmtGW(totalDemandMW),
      generation: fmtGW(totalGenerationMW),
      carbonIntensity: data.carbonIntensity?.actual || data.carbonIntensity?.forecast ? `${data.carbonIntensity.actual ?? data.carbonIntensity.forecast} gCO₂/kWh` : 'unavailable',
      carbonIndex: data.carbonIntensity?.index || 'unavailable',
      renewableShare: fmtPct(renewableShare),
      gasShare: fmtPct(gasShare),
      wind: fmtGW(windMW),
      solar: fmtGW(solarMW),
      gas: fmtGW(gasMW),
      nuclear: fmtGW(nuclearMW),
      importsExports: transfers(data.interconnectors).net === null ? 'unavailable' : `${fmtGW(Math.abs(transfers(data.interconnectors).net))} net ${transfers(data.interconnectors).net >= 0 ? 'imports' : 'exports'}`,
    },
  };
} catch (error) {
  snapshot = {
    generatedAt: new Date().toISOString(),
    timestamp: null,
    source: 'public grid data sources',
    status: 'unavailable',
    freshnessNote: `Build-time snapshot unavailable: ${error instanceof Error ? error.message : String(error)}`,
    metrics: {},
    display: {},
  };
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Generated static grid snapshot: ${snapshot.status}`);
