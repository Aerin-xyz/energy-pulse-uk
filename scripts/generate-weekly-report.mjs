import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { validateHistoricalRows, writeValidationReport } from './external-data-validation.mjs';
import { fetchHistoricalGeneration } from './historical-feed.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'src/data/energyMixGenerated.json');
const SITEMAP = join(ROOT, 'public/sitemap.xml');
const VALIDATION_OUT = join(ROOT, 'public/data/validation/latest.json');
const NESO_DEMAND_RESOURCE_ID = '177f6fa4-ae49-4182-81ea-0c6b35f26ca6';
const NESO_SQL_URL = 'https://api.neso.energy/api/3/action/datastore_search_sql';

const fmtDate = (iso) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
const periodsFor = (row) => {
  const n = Number(row.totalPeriods);
  return Number.isFinite(n) && n > 0 ? n : 48;
};
const averageMw = (row, halfHourlyMwhTotal) => (halfHourlyMwhTotal * 2) / periodsFor(row);
const averageGw = (row, halfHourlyMwhTotal) => `${(averageMw(row, halfHourlyMwhTotal) / 1000).toFixed(1)} GW`;
const pct = (n) => `${n.toFixed(1)}%`;
const fuel = (row, name) => row.fuelMix.find((x) => x.fuelType.toLowerCase() === name.toLowerCase()) || { mw: 0, percentage: 0 };
const renewableMw = (row) => fuel(row, 'Wind').mw + fuel(row, 'Solar').mw + fuel(row, 'Hydro').mw;
const renewableShare = (row) => (renewableMw(row) / row.totalMW) * 100;
const averageField = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length;
const fetchEmbeddedSolarAverageMw = async (date) => {
  const sql = `SELECT * from "${NESO_DEMAND_RESOURCE_ID}" WHERE "SETTLEMENT_DATE" = '${date}'`;
  const response = await fetch(`${NESO_SQL_URL}?sql=${encodeURIComponent(sql)}`);
  if (!response.ok) throw new Error(`NESO Demand Data Update failed ${response.status}: ${await response.text()}`);

  const json = await response.json();
  const actualRows = (json.result?.records || []).filter((row) => row.FORECAST_ACTUAL_INDICATOR === 'A');
  if (actualRows.length < 46) throw new Error(`NESO Demand Data Update returned ${actualRows.length} actual periods for ${date}`);

  return averageField(actualRows, 'EMBEDDED_SOLAR_GENERATION');
};
const withSolarBackfill = async (row) => {
  if (averageMw(row, fuel(row, 'Solar').mw) > 0) return row;

  const solarAverageMw = await fetchEmbeddedSolarAverageMw(row.settlementDate);
  if (!Number.isFinite(solarAverageMw) || solarAverageMw <= 0) return row;

  const solarHalfHourlyMwhTotal = (solarAverageMw * periodsFor(row)) / 2;
  const fuelMix = row.fuelMix.filter((item) => item.fuelType.toLowerCase() !== 'solar');
  const totalMW = row.totalMW + solarHalfHourlyMwhTotal;
  const next = {
    ...row,
    totalMW,
    fuelMix: [
      ...fuelMix,
      {
        fuelType: 'Solar',
        mw: solarHalfHourlyMwhTotal,
        percentage: 0,
        color: '#F7B633',
      },
    ],
    solarMatched: true,
    solarMatchedPeriods: periodsFor(row),
  };

  next.fuelMix = next.fuelMix.map((item) => ({
    ...item,
    percentage: totalMW > 0 ? Math.round((item.mw / totalMW) * 100) : 0,
  }));

  return next;
};

const feed = await fetchHistoricalGeneration('7d');
const feedRows = feed.data || [];
const rows = await Promise.all(feedRows.filter((row) => periodsFor(row) >= 46).map(withSolarBackfill));
if (rows.length < 2) throw new Error('Need at least 2 complete days of historical data');

const start = rows[0].settlementDate;
const end = rows[rows.length - 1].settlementDate;
const latestFeedDate = feedRows[feedRows.length - 1]?.settlementDate || end;
const reportDate = latestFeedDate;
const slug = `/reports/weekly/${reportDate}`;
const highestRenewable = rows.map((row) => ({ row, value: renewableShare(row) })).sort((a, b) => b.value - a.value)[0];
const highestWind = rows.map((row) => ({ row, value: fuel(row, 'Wind').mw })).sort((a, b) => b.value - a.value)[0];
const highestSolar = rows.map((row) => ({ row, value: fuel(row, 'Solar').mw })).sort((a, b) => b.value - a.value)[0];
const highestGas = rows.map((row) => ({ row, value: fuel(row, 'Gas').mw })).sort((a, b) => b.value - a.value)[0];
const lowestGas = rows.map((row) => ({ row, value: fuel(row, 'Gas').mw })).sort((a, b) => a.value - b.value)[0];
const highestGeneration = rows.map((row) => ({ row, value: row.totalMW })).sort((a, b) => b.value - a.value)[0];
const avgGenerationMw = rows.reduce((sum, row) => sum + averageMw(row, row.totalMW), 0) / rows.length;
const avgRenewableShare = rows.reduce((sum, row) => sum + renewableShare(row), 0) / rows.length;
const avgGasMw = rows.reduce((sum, row) => sum + averageMw(row, fuel(row, 'Gas').mw), 0) / rows.length;
const yesterday = rows[rows.length - 1];
const yRenew = renewableShare(yesterday);
const yesterdayAverageMw = averageMw(yesterday, yesterday.totalMW);

if (yesterdayAverageMw < 15000 || yesterdayAverageMw > 50000) {
  throw new Error(`Generated yesterday average looks implausible: ${Math.round(yesterdayAverageMw)} MW for ${yesterday.settlementDate}`);
}

const validation = await validateHistoricalRows(rows, { targetDate: yesterday.settlementDate });
writeValidationReport(validation, VALIDATION_OUT);
if (validation.status === 'failed') {
  const failedChecks = validation.checks
    .filter((check) => check.status === 'fail')
    .map((check) => `${check.id}: ${check.label}`)
    .join('; ');
  throw new Error(`External data validation failed for ${yesterday.settlementDate}: ${failedChecks}`);
}

const report = {
  slug,
  date: reportDate,
  title: `UK Electricity Mix Weekly Report: ${fmtDate(reportDate)}`,
  period: `${fmtDate(start)} to ${fmtDate(end)}`,
  intro: `A measured weekly report for EnergyMix.info using the available 7-day historical generation feed for ${fmtDate(start)} to ${fmtDate(end)}.`,
  summary: `The week from ${fmtDate(start)} to ${fmtDate(end)} averaged about ${(avgGenerationMw / 1000).toFixed(1)} GW of measured generation, with renewables averaging ${pct(avgRenewableShare)} of measured output. The strongest renewable day in the available data was ${fmtDate(highestRenewable.row.settlementDate)}, when wind, solar and hydro together averaged ${pct(highestRenewable.value)} of measured generation. Gas was highest on ${fmtDate(highestGas.row.settlementDate)} and lowest on ${fmtDate(lowestGas.row.settlementDate)}.`,
  takeaway: 'For flexible electricity use, the cleanest opportunities are likely to appear when wind is strong, gas is low and demand is not at a peak. This is the foundation for future EV-charging guidance, clean-electricity alerts and weekly newsletter summaries.',
  metrics: [
    ['Average measured generation', `~${(avgGenerationMw / 1000).toFixed(1)} GW across available settlement-period aggregates`],
    ['Average renewable share', pct(avgRenewableShare)],
    ['Highest renewable share', `${pct(highestRenewable.value)} on ${fmtDate(highestRenewable.row.settlementDate)}`],
    ['Highest average wind output', `~${averageGw(highestWind.row, highestWind.value)} on ${fmtDate(highestWind.row.settlementDate)}`],
    ['Highest average solar output', `~${averageGw(highestSolar.row, highestSolar.value)} on ${fmtDate(highestSolar.row.settlementDate)}`],
    ['Highest average gas output', `~${averageGw(highestGas.row, highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}`],
  ],
  drivers: [
    `Renewables were strongest on ${fmtDate(highestRenewable.row.settlementDate)}, when wind, solar and hydro averaged ${pct(highestRenewable.value)} of measured generation.`,
    `Wind was the largest swing factor in the available feed, peaking at about ${averageGw(highestWind.row, highestWind.value)} average output on ${fmtDate(highestWind.row.settlementDate)}.`,
    `Solar was strongest on ${fmtDate(highestSolar.row.settlementDate)}, averaging about ${averageGw(highestSolar.row, highestSolar.value)} across settlement periods after embedded-solar backfill where needed.`,
    `Gas averaged about ${(avgGasMw / 1000).toFixed(1)} GW across the period, rising highest on ${fmtDate(highestGas.row.settlementDate)} and falling lowest on ${fmtDate(lowestGas.row.settlementDate)}.`,
    `Measured generation was highest on ${fmtDate(highestGeneration.row.settlementDate)}, at roughly ${averageGw(highestGeneration.row, highestGeneration.value)} average output.`,
  ],
  cleanestPeriods: [
    {
      title: `Best low-carbon proxy: ${fmtDate(highestRenewable.row.settlementDate)}`,
      body: `Historical carbon-intensity aggregates are not yet part of this weekly report feed, so EnergyMix.info uses renewable share and gas output as cautious proxies. ${fmtDate(highestRenewable.row.settlementDate)} had the strongest renewable share at ${pct(highestRenewable.value)}.`,
    },
    {
      title: `Lowest gas proxy: ${fmtDate(lowestGas.row.settlementDate)}`,
      body: `Gas generation averaged about ${averageGw(lowestGas.row, lowestGas.value)} on ${fmtDate(lowestGas.row.settlementDate)}. Lower gas periods are often cleaner, but the report does not yet claim this was the lowest-carbon period without historical carbon-intensity validation.`,
    },
  ],
  higherCarbonPeriods: [
    {
      title: `Highest gas proxy: ${fmtDate(highestGas.row.settlementDate)}`,
      body: `Gas averaged about ${averageGw(highestGas.row, highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}. Gas-heavy periods are usually higher-carbon, but this is labelled as a proxy until historical carbon-intensity highs/lows are added to the report feed.`,
    },
  ],
  highlights: [
    { label: 'Wind', value: `Highest average wind output was about ${averageGw(highestWind.row, highestWind.value)} on ${fmtDate(highestWind.row.settlementDate)}.` },
    { label: 'Solar', value: `Highest average solar output was about ${averageGw(highestSolar.row, highestSolar.value)} on ${fmtDate(highestSolar.row.settlementDate)}.` },
    { label: 'Gas', value: `Highest average gas output was about ${averageGw(highestGas.row, highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}; lowest was about ${averageGw(lowestGas.row, lowestGas.value)} on ${fmtDate(lowestGas.row.settlementDate)}.` },
  ],
  methodologyNote: 'This report is generated from the available 7-day historical generation feed and validated against external public data. Carbon-intensity highs/lows and interconnector summaries should be treated as future additions unless they are present as validated historical aggregates.',
};

const generated = {
  generatedAt: new Date().toISOString(),
  reports: [report],
  latestReportSlug: slug,
  yesterday: {
    slug: '/yesterday',
    date: yesterday.settlementDate,
    title: `UK Electricity Mix Yesterday: ${fmtDate(yesterday.settlementDate)}`,
    summary: `Yesterday, ${fmtDate(yesterday.settlementDate)}, measured average generation was about ${(yesterdayAverageMw / 1000).toFixed(1)} GW. Renewables averaged ${pct(yRenew)} of measured generation, gas averaged ${averageGw(yesterday, fuel(yesterday, 'Gas').mw)}, wind averaged ${averageGw(yesterday, fuel(yesterday, 'Wind').mw)} and solar averaged ${averageGw(yesterday, fuel(yesterday, 'Solar').mw)}.`,
    metrics: [
      ['Average measured generation', `~${(yesterdayAverageMw / 1000).toFixed(1)} GW`],
      ['Average renewable share', pct(yRenew)],
      ['Average wind output', `~${averageGw(yesterday, fuel(yesterday, 'Wind').mw)}`],
      ['Average solar output', `~${averageGw(yesterday, fuel(yesterday, 'Solar').mw)}`],
      ['Average gas output', `~${averageGw(yesterday, fuel(yesterday, 'Gas').mw)}`],
    ],
  },
  records: {
    highestRenewableShare: { value: pct(highestRenewable.value), date: fmtDate(highestRenewable.row.settlementDate), text: `Current measured 7-day high: ${pct(highestRenewable.value)} average renewable share on ${fmtDate(highestRenewable.row.settlementDate)}, based on the available historical generation feed.` },
    highestWindGeneration: { value: averageGw(highestWind.row, highestWind.value), date: fmtDate(highestWind.row.settlementDate), text: `Current measured 7-day high: about ${averageGw(highestWind.row, highestWind.value)} average wind output on ${fmtDate(highestWind.row.settlementDate)}, based on the available historical generation feed.` },
    highestSolarGeneration: { value: averageGw(highestSolar.row, highestSolar.value), date: fmtDate(highestSolar.row.settlementDate), text: `Current measured 7-day high: about ${averageGw(highestSolar.row, highestSolar.value)} average solar output on ${fmtDate(highestSolar.row.settlementDate)}, based on the available historical generation feed.` },
    highestGasGeneration: { value: averageGw(highestGas.row, highestGas.value), date: fmtDate(highestGas.row.settlementDate), text: `Current measured 7-day high: about ${averageGw(highestGas.row, highestGas.value)} average gas output on ${fmtDate(highestGas.row.settlementDate)}, based on the available historical generation feed.` },
  },
  socialPosts: [
    { title: 'Monday weekly grid brief', body: `Last week in Britain’s electricity mix:\n\n• Highest renewable share in the available feed: ${pct(highestRenewable.value)} on ${fmtDate(highestRenewable.row.settlementDate)}\n• Highest average wind output: ~${averageGw(highestWind.row, highestWind.value)} on ${fmtDate(highestWind.row.settlementDate)}\n• Highest average solar output: ~${averageGw(highestSolar.row, highestSolar.value)} on ${fmtDate(highestSolar.row.settlementDate)}\n• Highest average gas output: ~${averageGw(highestGas.row, highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}\n\nThe shift was clear: gas-heavy weekdays gave way to a cleaner, wind-led weekend.\n\nFull report: https://energymix.info${slug}/` },
    { title: 'Wednesday explainer', body: 'What does “UK electricity mix” actually mean?\n\nFor live grid dashboards, it usually means Great Britain’s electricity system: England, Scotland and Wales. Northern Ireland is part of the UK, but operates in a separate electricity market.\n\nExplainer: https://energymix.info/uk-electricity-mix' },
    { title: 'Friday practical clean-electricity post', body: 'The cleanest time to use electricity is not a fixed hour.\n\nIt changes with wind, solar, demand, imports and gas generation. Windy overnight periods and sunny middays can be much cleaner than still early-evening peaks.\n\nGuide: https://energymix.info/cleanest-time-to-use-electricity' },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(generated, null, 2) + '\n');

let sitemap = readFileSync(SITEMAP, 'utf8');
const upsertSitemapUrl = (url, lastmod, changefreq = 'weekly', priority = '0.75') => {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`  <url>\\n    <loc>${escapedUrl}<\\/loc>\\n    <lastmod>[^<]+<\\/lastmod>\\n    <changefreq>[^<]+<\\/changefreq>\\n    <priority>[^<]+<\\/priority>\\n  <\\/url>`);
  const next = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  if (block.test(sitemap)) {
    sitemap = sitemap.replace(block, next);
    return;
  }
  sitemap = sitemap.replace('</urlset>', `${next}\n</urlset>`);
};

for (const [url, changefreq, priority] of [
  ['https://energymix.info/', 'hourly', '1.0'],
  ['https://energymix.info/uk-electricity-mix', 'weekly', '0.95'],
  [`https://energymix.info${slug}/`, 'weekly', '0.75'],
  ['https://energymix.info/yesterday/', 'weekly', '0.75'],
  ['https://energymix.info/today/', 'hourly', '0.9'],
  ['https://energymix.info/reports/', 'weekly', '0.8'],
  ['https://energymix.info/carbon-intensity/', 'weekly', '0.9'],
  ['https://energymix.info/renewables/', 'weekly', '0.9'],
  ['https://energymix.info/cleanest-time-to-use-electricity/', 'weekly', '0.9'],
  ['https://energymix.info/gas-generation/', 'weekly', '0.85'],
  ['https://energymix.info/interconnectors/', 'weekly', '0.85'],
  ['https://energymix.info/electricity-demand/', 'weekly', '0.85'],
  ['https://energymix.info/uk-electricity-generation-live/', 'weekly', '0.9'],
  ['https://energymix.info/uk-renewable-electricity', 'hourly', '0.9'],
  ['https://energymix.info/uk-wind-generation-live', 'hourly', '0.85'],
  ['https://energymix.info/uk-electricity-carbon-intensity', 'hourly', '0.85'],
  ['https://energymix.info/uk-electricity-imports-exports', 'hourly', '0.85'],
]) {
  upsertSitemapUrl(url, reportDate, changefreq, priority);
}
writeFileSync(SITEMAP, sitemap);
console.log(`Generated weekly report data for ${slug}`);
console.log(`External validation ${validation.status} for ${yesterday.settlementDate}: ${VALIDATION_OUT}`);
