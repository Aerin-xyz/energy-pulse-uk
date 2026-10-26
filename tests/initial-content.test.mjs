import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_EVIDENCE, absoluteDailySummary, pageSchema } from '../src/lib/initialEvidence.mjs';

const read = route => readFileSync(`dist/${route ? `${route}/` : ''}index.html`, 'utf8');
const schemas = html => [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(match => { const schema = JSON.parse(match[1]); return schema['@graph'] || [schema]; });
const live = ['', 'today', 'carbon-intensity', 'uk-solar-power-today', 'uk-wind-power-today', 'renewables-share-today'];

test('live initial HTML contains the shared honest state, never a frozen numerical snapshot', () => {
  for (const route of live) {
    const html = read(route);
    const contract = JSON.parse(html.match(/<script type="application\/json" id="initial-evidence">([\s\S]*?)<\/script>/)?.[1] || 'null');
    assert.deepEqual(contract, INITIAL_EVIDENCE, route);
    assert.match(html, /data-evidence-status="unavailable"/, route);
    assert.doesNotMatch(html, /Saved GB electricity snapshot|2026-09-29 04:30|Latest static snapshot|Yesterday, Monday 28 September/, route);
  }
});

test('initial topic content supplies the real explanation and source links', () => {
  assert.match(read('carbon-intensity'), /What is a low carbon-intensity number/);
  assert.match(read('carbon-intensity'), /Short answer/);
  assert.match(read('methodology'), /Metric definitions used by the atlas/);
  assert.match(read('methodology'), /Renewable share is wind, solar, hydro and biomass divided by domestic generation/);
  assert.match(read('data'), /<table/);
  assert.match(read('data'), /https:\/\/bmrs.elexon.co.uk\//);
  assert.match(read('data'), /https:\/\/www.solar.sheffield.ac.uk\/pvlive\//);
});

test('glossary serves actual definitions with stable anchors before JavaScript', () => {
  const html = read('glossary');
  assert.equal([...html.matchAll(/<dt[\s>]/g)].length, 9);
  assert.match(html, /id="settlement-period"/);
  assert.match(html, /A 30-minute electricity-market accounting window/);
  assert.match(html, /id="carbon-intensity"/);
});

test('schema identity is consolidated and HTML is never advertised as JSON', () => {
  for (const route of [...live, 'data', 'methodology', 'glossary']) {
    const html = read(route), items = schemas(html);
    assert.equal(items.filter(x => x['@type'] === 'Organization').length, 1, route);
    assert.equal(items.filter(x => x['@type'] === 'WebSite').length, 1, route);
    assert.equal(items.filter(x => x['@type'] === 'WebPage').length, 1, route);
    assert.equal(items.filter(x => x['@type'] === 'Dataset').length, 0, route);
    assert.doesNotMatch(JSON.stringify(items), /DataDownload/);
    assert.equal(items.find(x => x['@type'] === 'Organization')['@id'], 'https://energymix.info/#organization');
    assert.equal((html.match(/<title[\s>]/g) || []).length, 1, route);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, route);
  }
});

test('frozen daily context uses an absolute archive date without rewriting the archive', () => {
  const daily = { date: '2026-09-28', summary: 'Yesterday, Monday 28 September, measured average generation was about 26.8 GW.' };
  assert.equal(absoluteDailySummary(daily), 'Archived daily context (2026-09-28): Monday 28 September, measured average generation was about 26.8 GW.');
  assert.match(daily.summary, /^Yesterday,/);
  assert.match(read('today'), /Archived daily context \(2026-09-28\)/);
  assert.doesNotMatch(read('yesterday'), /Yesterday, Monday|Yesterday in five numbers/);
});

test('query/filter state canonicalises to its page and reports preserve publication dates', () => {
  const graph = pageSchema('/uk-electricity-mix/?fuel=wind#map')['@graph'];
  assert.equal(graph.find(x => x['@type'] === 'WebPage').url, 'https://energymix.info/uk-electricity-mix');
  const article = pageSchema('/reports/weekly/2026-09-29', { report: { title: 'Dated report', date: '2026-09-29' } })['@graph'].at(-1);
  assert.equal(article.datePublished, '2026-09-29');
  assert.equal(article.dateModified, undefined);
});

test('reports and record highs disclose their actual archive window in the initial response', () => {
  for (const route of ['reports/weekly/2026-09-29', 'records', 'records/highest-wind-generation']) {
    const html = read(route);
    assert.match(html, /Partial week/);
    assert.match(html, /2026-09-23–2026-09-28/);
  }
  assert.match(read('records'), /not all-time records/);
  const article = schemas(read('reports/weekly/2026-09-29')).find(item => item['@type'] === 'Article');
  assert.equal(article.datePublished, '2026-09-29');
  assert.equal(article.dateModified, '2026-10-25');
});

test('sitemap selects existing canonical pages and registered initial links avoid redirects', () => {
  const routes = JSON.parse(readFileSync('dist/route-manifest.json', 'utf8'));
  const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(urls.length, routes.length - 2); // deliberate noindex operational pages
  assert.ok(!sitemap.includes('<lastmod>'), 'Do not invent modification dates');
  const canonical = path => path === '/' || path === '/uk-electricity-mix' ? path : `${path}/`;
  for (const route of routes) {
    const html = read(route.slice(1));
    const expected = `https://energymix.info${canonical(route)}`;
    assert.ok(html.includes(`href="${expected}"`), route);
    for (const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
      const path = match[1], base = path.replace(/\/+$/, '') || '/';
      if (routes.includes(base)) assert.equal(path, canonical(base), `${route} links to ${path}`);
    }
  }
});


test('homepage initial layout renders the actual national summary, not the obsolete atlas shell', () => {
  const html = read('');
  assert.match(html, /id="energy-main"/);
  assert.match(html, /class="national-layout"/);
  assert.match(html, /aria-label="National electricity summary"/);
  assert.match(html, /class="national-fuels"/);
  assert.match(html, /Loading the electricity atlas/);
  assert.doesNotMatch(html, /class="atlas-intro"|class="atlas-deck"|id="seo-prerender"/);
});
