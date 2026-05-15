import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dmpncHV5dGV6b21kbHNheWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjYwMDQsImV4cCI6MjA3MjE0MjAwNH0.cEnOyHqSeamIXVX4N3-nkuXerqLsEsSsRD1Iy3mo15o';
const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'src/data/energyMixGenerated.json');
const SITEMAP = join(ROOT, 'public/sitemap.xml');

const fmtDate = (iso) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
const gw = (mw) => `${(mw / 48 / 1000).toFixed(1)} GW`;
const pct = (n) => `${n.toFixed(1)}%`;
const fuel = (row, name) => row.fuelMix.find((x) => x.fuelType.toLowerCase() === name.toLowerCase()) || { mw: 0, percentage: 0 };
const renewableMw = (row) => fuel(row, 'Wind').mw + fuel(row, 'Solar').mw + fuel(row, 'Hydro').mw;
const renewableShare = (row) => (renewableMw(row) / row.totalMW) * 100;

const res = await fetch('https://cxvjgpuytezomdlsayif.supabase.co/functions/v1/historical-generation?period=7d', {
  method: 'POST',
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'Content-Type': 'application/json' },
});
if (!res.ok) throw new Error(`historical-generation failed ${res.status}: ${await res.text()}`);
const feed = await res.json();
const rows = feed.data || [];
if (rows.length < 2) throw new Error('Need at least 2 days of historical data');

const start = rows[0].settlementDate;
const end = rows[rows.length - 1].settlementDate;
const reportDate = end;
const slug = `/reports/weekly/${reportDate}`;
const highestRenewable = rows.map((row) => ({ row, value: renewableShare(row) })).sort((a, b) => b.value - a.value)[0];
const highestWind = rows.map((row) => ({ row, value: fuel(row, 'Wind').mw })).sort((a, b) => b.value - a.value)[0];
const highestSolar = rows.map((row) => ({ row, value: fuel(row, 'Solar').mw })).sort((a, b) => b.value - a.value)[0];
const highestGas = rows.map((row) => ({ row, value: fuel(row, 'Gas').mw })).sort((a, b) => b.value - a.value)[0];
const avgGenerationMw = rows.reduce((sum, row) => sum + row.totalMW, 0) / rows.length / 48;
const yesterday = rows[rows.length - 2];
const yRenew = renewableShare(yesterday);

const report = {
  slug,
  date: reportDate,
  title: `UK Electricity Mix Weekly Report: ${fmtDate(reportDate)}`,
  period: `${fmtDate(start)} to ${fmtDate(end)}`,
  intro: `A measured weekly report for EnergyMix.info using the available 7-day historical generation feed for ${fmtDate(start)} to ${fmtDate(end)}.`,
  summary: `The week from ${fmtDate(start)} to ${fmtDate(end)} shifted from gas-heavy weekdays into a cleaner, wind-led weekend. The strongest renewable day in the available data was ${fmtDate(highestRenewable.row.settlementDate)}, when wind, solar and hydro together averaged ${pct(highestRenewable.value)} of measured generation across settlement periods. Gas was highest on ${fmtDate(highestGas.row.settlementDate)} and lowest on ${fmtDate(rows.map((row) => ({ row, value: fuel(row, 'Gas').mw })).sort((a, b) => a.value - b.value)[0].row.settlementDate)}.`,
  takeaway: 'For flexible electricity use, the cleanest opportunities are likely to appear when wind is strong, gas is low and demand is not at a peak. This is the foundation for future EV-charging guidance, clean-electricity alerts and weekly newsletter summaries.',
  metrics: [
    ['Average measured generation', `~${(avgGenerationMw / 1000).toFixed(1)} GW across available settlement-period aggregates`],
    ['Highest renewable share', `${pct(highestRenewable.value)} on ${fmtDate(highestRenewable.row.settlementDate)}`],
    ['Highest average wind output', `~${gw(highestWind.value)} on ${fmtDate(highestWind.row.settlementDate)}`],
    ['Highest average solar output', `~${gw(highestSolar.value)} on ${fmtDate(highestSolar.row.settlementDate)}`],
    ['Highest average gas output', `~${gw(highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}`],
  ],
};

const generated = {
  generatedAt: new Date().toISOString(),
  reports: [report],
  latestReportSlug: slug,
  yesterday: {
    slug: '/yesterday',
    date: yesterday.settlementDate,
    title: `UK Electricity Mix Yesterday: ${fmtDate(yesterday.settlementDate)}`,
    summary: `Yesterday, ${fmtDate(yesterday.settlementDate)}, measured average generation was about ${(yesterday.totalMW / 48 / 1000).toFixed(1)} GW. Renewables averaged ${pct(yRenew)} of measured generation, gas averaged ${gw(fuel(yesterday, 'Gas').mw)}, wind averaged ${gw(fuel(yesterday, 'Wind').mw)} and solar averaged ${gw(fuel(yesterday, 'Solar').mw)}.`,
    metrics: [
      ['Average measured generation', `~${(yesterday.totalMW / 48 / 1000).toFixed(1)} GW`],
      ['Average renewable share', pct(yRenew)],
      ['Average wind output', `~${gw(fuel(yesterday, 'Wind').mw)}`],
      ['Average solar output', `~${gw(fuel(yesterday, 'Solar').mw)}`],
      ['Average gas output', `~${gw(fuel(yesterday, 'Gas').mw)}`],
    ],
  },
  records: {
    highestRenewableShare: { value: pct(highestRenewable.value), date: fmtDate(highestRenewable.row.settlementDate), text: `Current measured 7-day high: ${pct(highestRenewable.value)} average renewable share on ${fmtDate(highestRenewable.row.settlementDate)}, based on the available historical generation feed.` },
    highestWindGeneration: { value: gw(highestWind.value), date: fmtDate(highestWind.row.settlementDate), text: `Current measured 7-day high: about ${gw(highestWind.value)} average wind output on ${fmtDate(highestWind.row.settlementDate)}, based on the available historical generation feed.` },
    highestSolarGeneration: { value: gw(highestSolar.value), date: fmtDate(highestSolar.row.settlementDate), text: `Current measured 7-day high: about ${gw(highestSolar.value)} average solar output on ${fmtDate(highestSolar.row.settlementDate)}, based on the available historical generation feed.` },
    highestGasGeneration: { value: gw(highestGas.value), date: fmtDate(highestGas.row.settlementDate), text: `Current measured 7-day high: about ${gw(highestGas.value)} average gas output on ${fmtDate(highestGas.row.settlementDate)}, based on the available historical generation feed.` },
  },
  socialPosts: [
    { title: 'Monday weekly grid brief', body: `Last week in Britain’s electricity mix:\n\n• Highest renewable share in the available feed: ${pct(highestRenewable.value)} on ${fmtDate(highestRenewable.row.settlementDate)}\n• Highest average wind output: ~${gw(highestWind.value)} on ${fmtDate(highestWind.row.settlementDate)}\n• Highest average solar output: ~${gw(highestSolar.value)} on ${fmtDate(highestSolar.row.settlementDate)}\n• Highest average gas output: ~${gw(highestGas.value)} on ${fmtDate(highestGas.row.settlementDate)}\n\nThe shift was clear: gas-heavy weekdays gave way to a cleaner, wind-led weekend.\n\nFull report: https://energymix.info${slug}/` },
    { title: 'Wednesday explainer', body: 'What does “UK electricity mix” actually mean?\n\nFor live grid dashboards, it usually means Great Britain’s electricity system: England, Scotland and Wales. Northern Ireland is part of the UK, but operates in a separate electricity market.\n\nExplainer: https://energymix.info/uk-electricity-mix' },
    { title: 'Friday practical clean-electricity post', body: 'The cleanest time to use electricity is not a fixed hour.\n\nIt changes with wind, solar, demand, imports and gas generation. Windy overnight periods and sunny middays can be much cleaner than still early-evening peaks.\n\nGuide: https://energymix.info/cleanest-time-to-use-electricity' },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(generated, null, 2) + '\n');

let sitemap = readFileSync(SITEMAP, 'utf8');
for (const url of [`https://energymix.info${slug}/`, 'https://energymix.info/yesterday/']) {
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    sitemap = sitemap.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${reportDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>\n</urlset>`);
  }
}
writeFileSync(SITEMAP, sitemap);
console.log(`Generated weekly report data for ${slug}`);
