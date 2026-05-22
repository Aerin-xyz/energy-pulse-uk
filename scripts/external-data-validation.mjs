import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchHistoricalGeneration } from './historical-feed.mjs';

const NESO_GENERATION_RESOURCE_ID = 'f93d1835-75bc-43e5-84ad-12472b180a98';
const NESO_DEMAND_RESOURCE_ID = '177f6fa4-ae49-4182-81ea-0c6b35f26ca6';
const ROOT = new URL('..', import.meta.url).pathname;

const SOURCES = {
  elexonFuelHh: {
    name: 'Elexon Insights FUELHH',
    url: 'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH',
  },
  nesoHistoricGenerationMix: {
    name: 'NESO Historic GB Generation Mix',
    url: 'https://api.neso.energy/api/3/action/datastore_search_sql',
    resourceId: NESO_GENERATION_RESOURCE_ID,
  },
  nesoDemandUpdate: {
    name: 'NESO Demand Data Update',
    url: 'https://api.neso.energy/api/3/action/datastore_search_sql',
    resourceId: NESO_DEMAND_RESOURCE_ID,
  },
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const periodsFor = (row) => {
  const n = Number(row.totalPeriods);
  return Number.isFinite(n) && n > 0 ? n : 48;
};

const averageMw = (row, halfHourlyMwhTotal) => (toNumber(halfHourlyMwhTotal) * 2) / periodsFor(row);

const getFuelTotal = (row, fuelType) => {
  const item = row.fuelMix?.find((fuel) => fuel.fuelType.toLowerCase() === fuelType.toLowerCase());
  return toNumber(item?.mw);
};

const averageFuelMw = (row, fuelType) => averageMw(row, getFuelTotal(row, fuelType));

const percentage = (part, total) => {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return (part / total) * 100;
};

const relativeDelta = (actual, expected) => {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected === 0) return null;
  return ((actual - expected) / expected) * 100;
};

const makeCheck = ({ id, label, actual, expected, unit = 'MW', maxAbsDelta, maxPctDelta, source, severity = 'error' }) => {
  const absDelta = actual - expected;
  const pctDelta = relativeDelta(actual, expected);
  const passesAbs = maxAbsDelta == null || Math.abs(absDelta) <= maxAbsDelta;
  const passesPct = maxPctDelta == null || pctDelta == null || Math.abs(pctDelta) <= maxPctDelta;
  const status = passesAbs && passesPct ? 'pass' : severity === 'warning' ? 'warning' : 'fail';

  return {
    id,
    label,
    status,
    source,
    actual: Number(actual.toFixed(2)),
    expected: Number(expected.toFixed(2)),
    unit,
    delta: Number(absDelta.toFixed(2)),
    deltaPercent: pctDelta == null ? null : Number(pctDelta.toFixed(2)),
    tolerance: {
      maxAbsDelta,
      maxPctDelta,
    },
  };
};

const sqlUrl = (sql) => `${SOURCES.nesoHistoricGenerationMix.url}?sql=${encodeURIComponent(sql)}`;

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
};

const averageField = (rows, key) => rows.reduce((sum, row) => sum + toNumber(row[key]), 0) / rows.length;

const averageElexonFuel = (periods, keys) => periods.reduce((sum, period) => {
  return sum + keys.reduce((fuelSum, key) => fuelSum + toNumber(period[key]), 0);
}, 0) / periods.length;

const fetchNesoGenerationForDate = async (date) => {
  const next = addDays(date, 1);
  const sql = `SELECT * from "${NESO_GENERATION_RESOURCE_ID}" WHERE "DATETIME" >= '${date}T00:00:00' AND "DATETIME" < '${next}T00:00:00'`;
  const json = await fetchJson(sqlUrl(sql));
  const rows = json.result?.records || [];
  if (rows.length < 46) throw new Error(`NESO generation mix returned ${rows.length} periods for ${date}`);

  return {
    source: SOURCES.nesoHistoricGenerationMix,
    periodCount: rows.length,
    averagesMw: {
      generationWithImports: averageField(rows, 'GENERATION'),
      gas: averageField(rows, 'GAS'),
      wind: averageField(rows, 'WIND'),
      embeddedWind: averageField(rows, 'WIND_EMB'),
      solar: averageField(rows, 'SOLAR'),
      hydro: averageField(rows, 'HYDRO'),
      nuclear: averageField(rows, 'NUCLEAR'),
      biomass: averageField(rows, 'BIOMASS'),
      imports: averageField(rows, 'IMPORTS'),
      renewableIncludingEmbeddedWind: averageField(rows, 'RENEWABLE'),
      carbonIntensity: averageField(rows, 'CARBON_INTENSITY'),
    },
  };
};

const fetchNesoDemandForDate = async (date) => {
  const sql = `SELECT * from "${NESO_DEMAND_RESOURCE_ID}" WHERE "SETTLEMENT_DATE" = '${date}'`;
  const json = await fetchJson(`${SOURCES.nesoDemandUpdate.url}?sql=${encodeURIComponent(sql)}`);
  const actualRows = (json.result?.records || []).filter((row) => row.FORECAST_ACTUAL_INDICATOR === 'A');
  if (actualRows.length < 46) throw new Error(`NESO demand update returned ${actualRows.length} actual periods for ${date}`);

  return {
    source: SOURCES.nesoDemandUpdate,
    periodCount: actualRows.length,
    averagesMw: {
      nationalDemand: averageField(actualRows, 'ND'),
      transmissionSystemDemand: averageField(actualRows, 'TSD'),
      embeddedWind: averageField(actualRows, 'EMBEDDED_WIND_GENERATION'),
      embeddedSolar: averageField(actualRows, 'EMBEDDED_SOLAR_GENERATION'),
      pumpedStoragePumping: averageField(actualRows, 'PUMP_STORAGE_PUMPING'),
    },
  };
};

const fetchElexonFuelHhForDate = async (date) => {
  const next = addDays(date, 1);
  const url = `${SOURCES.elexonFuelHh.url}?publishDateTimeFrom=${date}T00:00Z&publishDateTimeTo=${next}T00:30Z`;
  const json = await fetchJson(url);
  const records = (json.data || json).filter((row) => row.startTime >= `${date}T00:00:00Z` && row.startTime < `${next}T00:00:00Z`);

  const periodMap = new Map();
  for (const row of records) {
    const period = periodMap.get(row.startTime) || {};
    period[row.fuelType] = toNumber(row.generation);
    periodMap.set(row.startTime, period);
  }

  const periods = Array.from(periodMap.values());
  if (periods.length < 46) throw new Error(`Elexon FUELHH returned ${periods.length} periods for ${date}`);

  return {
    source: SOURCES.elexonFuelHh,
    periodCount: periods.length,
    averagesMw: {
      measuredGenerationExcludingSolar: averageElexonFuel(periods, ['BIOMASS', 'CCGT', 'COAL', 'NPSHYD', 'NUCLEAR', 'OCGT', 'OIL', 'OTHER', 'PS', 'WIND']),
      gas: averageElexonFuel(periods, ['CCGT', 'OCGT']),
      wind: averageElexonFuel(periods, ['WIND']),
      hydroAndPumpedStorage: averageElexonFuel(periods, ['NPSHYD', 'PS']),
      nuclear: averageElexonFuel(periods, ['NUCLEAR']),
      biomass: averageElexonFuel(periods, ['BIOMASS']),
      coalAndOil: averageElexonFuel(periods, ['COAL', 'OIL']),
      other: averageElexonFuel(periods, ['OTHER']),
    },
  };
};

export const validateHistoricalRows = async (rows, options = {}) => {
  const completeRows = rows.filter((row) => periodsFor(row) >= 46);
  const target = options.targetDate
    ? completeRows.find((row) => row.settlementDate === options.targetDate)
    : completeRows[completeRows.length - 1];

  if (!target) throw new Error(`No complete generated row available for ${options.targetDate || 'latest day'}`);

  const generated = {
    date: target.settlementDate,
    periodCount: periodsFor(target),
    averagesMw: {
      measuredGeneration: averageMw(target, target.totalMW),
      gas: averageFuelMw(target, 'Gas'),
      wind: averageFuelMw(target, 'Wind'),
      solar: averageFuelMw(target, 'Solar'),
      hydro: averageFuelMw(target, 'Hydro'),
      nuclear: averageFuelMw(target, 'Nuclear'),
      biomass: averageFuelMw(target, 'Biomass'),
      coal: averageFuelMw(target, 'Coal'),
      other: averageFuelMw(target, 'Other'),
      renewable: averageMw(target, getFuelTotal(target, 'Wind') + getFuelTotal(target, 'Solar') + getFuelTotal(target, 'Hydro')),
    },
  };

  generated.renewableShare = percentage(generated.averagesMw.renewable, generated.averagesMw.measuredGeneration);

  const checks = [
    {
      id: 'generated.complete-day-periods',
      label: 'Generated day has at least 46 settlement periods',
      status: generated.periodCount >= 46 ? 'pass' : 'fail',
      source: 'generated feed',
      actual: generated.periodCount,
      expected: 48,
      unit: 'periods',
      delta: generated.periodCount - 48,
      deltaPercent: relativeDelta(generated.periodCount, 48),
      tolerance: { maxAbsDelta: 2, maxPctDelta: null },
    },
    makeCheck({
      id: 'generated.measured-generation-plausible',
      label: 'Generated average measured generation is plausible',
      actual: generated.averagesMw.measuredGeneration,
      expected: 30000,
      maxAbsDelta: 20000,
      source: 'internal plausibility band',
      severity: 'error',
    }),
  ];

  const sourceResults = {};

  try {
    const elexon = await fetchElexonFuelHhForDate(generated.date);
    sourceResults.elexonFuelHh = elexon;
    checks.push(
      makeCheck({
        id: 'elexon.gas-average',
        label: 'Gas average matches Elexon FUELHH CCGT + OCGT',
        actual: generated.averagesMw.gas,
        expected: elexon.averagesMw.gas,
        maxAbsDelta: 300,
        maxPctDelta: 8,
        source: elexon.source.name,
      }),
      makeCheck({
        id: 'elexon.wind-average',
        label: 'Wind average matches Elexon FUELHH',
        actual: generated.averagesMw.wind,
        expected: elexon.averagesMw.wind,
        maxAbsDelta: 300,
        maxPctDelta: 8,
        source: elexon.source.name,
      }),
      makeCheck({
        id: 'elexon.generation-plus-solar-average',
        label: 'Measured generation matches Elexon FUELHH plus generated solar',
        actual: generated.averagesMw.measuredGeneration,
        expected: elexon.averagesMw.measuredGenerationExcludingSolar + generated.averagesMw.solar,
        maxAbsDelta: 750,
        maxPctDelta: 4,
        source: elexon.source.name,
      }),
      makeCheck({
        id: 'elexon.nuclear-average',
        label: 'Nuclear average matches Elexon FUELHH',
        actual: generated.averagesMw.nuclear,
        expected: elexon.averagesMw.nuclear,
        maxAbsDelta: 300,
        maxPctDelta: 8,
        source: elexon.source.name,
      }),
    );
  } catch (error) {
    checks.push({
      id: 'elexon.fetch',
      label: 'Elexon FUELHH validator fetch',
      status: 'warning',
      source: SOURCES.elexonFuelHh.name,
      message: error.message,
    });
  }

  try {
    const nesoGeneration = await fetchNesoGenerationForDate(generated.date);
    sourceResults.nesoHistoricGenerationMix = nesoGeneration;
    checks.push(
      makeCheck({
        id: 'neso.gas-average',
        label: 'Gas average matches NESO historic generation mix',
        actual: generated.averagesMw.gas,
        expected: nesoGeneration.averagesMw.gas,
        maxAbsDelta: 300,
        maxPctDelta: 8,
        source: nesoGeneration.source.name,
      }),
      makeCheck({
        id: 'neso.wind-average',
        label: 'Wind average matches NESO transmission wind',
        actual: generated.averagesMw.wind,
        expected: nesoGeneration.averagesMw.wind,
        maxAbsDelta: 300,
        maxPctDelta: 8,
        source: nesoGeneration.source.name,
      }),
      makeCheck({
        id: 'neso.solar-average',
        label: 'Solar average broadly matches NESO historic generation mix',
        actual: generated.averagesMw.solar,
        expected: nesoGeneration.averagesMw.solar,
        maxAbsDelta: 500,
        maxPctDelta: 15,
        source: nesoGeneration.source.name,
      }),
    );
  } catch (error) {
    checks.push({
      id: 'neso-generation.fetch',
      label: 'NESO historic generation validator fetch',
      status: 'warning',
      source: SOURCES.nesoHistoricGenerationMix.name,
      message: error.message,
    });
  }

  try {
    const nesoDemand = await fetchNesoDemandForDate(generated.date);
    sourceResults.nesoDemandUpdate = nesoDemand;
    checks.push(
      makeCheck({
        id: 'neso-demand.embedded-solar-average',
        label: 'Generated solar is close to NESO embedded solar update',
        actual: generated.averagesMw.solar,
        expected: nesoDemand.averagesMw.embeddedSolar,
        maxAbsDelta: 500,
        maxPctDelta: 15,
        source: nesoDemand.source.name,
      }),
      makeCheck({
        id: 'neso-demand.period-count',
        label: 'NESO Demand Data Update has a complete actual day',
        actual: nesoDemand.periodCount,
        expected: 48,
        maxAbsDelta: 2,
        source: nesoDemand.source.name,
        unit: 'periods',
      }),
    );
  } catch (error) {
    checks.push({
      id: 'neso-demand.fetch',
      label: 'NESO demand validator fetch',
      status: 'warning',
      source: SOURCES.nesoDemandUpdate.name,
      message: error.message,
    });
  }

  const externalCheckCount = checks.filter((check) => check.source && check.source !== 'generated feed' && check.source !== 'internal plausibility band' && check.status !== 'warning').length;
  if (externalCheckCount === 0) {
    checks.push({
      id: 'external.available',
      label: 'At least one external validation source returned usable checks',
      status: 'fail',
      source: 'external validation',
      message: 'No external source returned usable validation checks.',
    });
  }

  const status = checks.some((check) => check.status === 'fail')
    ? 'failed'
    : checks.some((check) => check.status === 'warning')
      ? 'warning'
      : 'passed';

  return {
    status,
    generatedAt: new Date().toISOString(),
    date: generated.date,
    generated,
    sources: sourceResults,
    checks,
  };
};

export const writeValidationReport = (validation, outputPath = join(ROOT, 'public/data/validation/latest.json')) => {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(validation, null, 2) + '\n');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetDate = process.argv[2];
  const outputPath = process.argv[3] || join(ROOT, 'public/data/validation/latest.json');
  const feed = await fetchHistoricalGeneration('7d');
  const validation = await validateHistoricalRows(feed.data || [], { targetDate });
  writeValidationReport(validation, outputPath);
  console.log(`External validation ${validation.status} for ${validation.date}: ${outputPath}`);
  if (validation.status === 'failed') process.exitCode = 1;
}
