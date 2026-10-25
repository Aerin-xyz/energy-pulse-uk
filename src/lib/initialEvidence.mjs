// Static hosting cannot establish observation freshness at request time. Never
// turn a successful build (or a retained archive cache) into a live reading.
// The browser starts in this same state, then obtains independently dated data.
export const INITIAL_EVIDENCE = Object.freeze({
  schemaVersion: 1,
  status: 'unavailable',
  geography: 'Great Britain',
  observation: null,
  title: 'Current readings unavailable',
  explanation: 'This page does not include a verified current observation. The interactive dashboard requests the latest available source data and labels its observation period. If that request fails, current values remain unavailable; archived reports are not substituted.',
});

export function absoluteDailySummary(daily) {
  if (!daily?.date) return 'No dated daily summary is available.';
  const summary = String(daily.summary || '').replace(/^Yesterday,\s*/i, '').replace(/^Today,\s*/i, '');
  return `Archived daily context (${daily.date}): ${summary}`;
}

export function canonicalPath(pathname) {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return path === '/' || path === '/uk-electricity-mix' ? path : `${path}/`;
}

export function pageSchema(pathname, { title, description, report } = {}) {
  const site = 'https://energymix.info/';
  const url = `https://energymix.info${canonicalPath(pathname)}`;
  const publisher = `${site}#organization`;
  const website = `${site}#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': publisher, name: 'Energy Mix', url: site, logo: `${site}favicon.png` },
      { '@type': 'WebSite', '@id': website, name: 'Energy Mix', url: site, publisher: { '@id': publisher }, inLanguage: 'en-GB' },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, ...(title ? { name: title } : {}), ...(description ? { description } : {}), inLanguage: 'en-GB', isPartOf: { '@id': website }, publisher: { '@id': publisher } },
      ...(report ? [{ '@type': 'Article', '@id': `${url}#article`, headline: report.title, datePublished: report.date, mainEntityOfPage: { '@id': `${url}#webpage` }, author: { '@id': publisher }, publisher: { '@id': publisher } }] : []),
    ],
  };
}
