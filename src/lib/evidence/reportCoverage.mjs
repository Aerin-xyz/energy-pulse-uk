// Presentation annotations never mutate frozen publication figures or dates.
export const REPORT_COVERAGE_CLARIFIED_AT = '2026-10-25';
const DAY = 86400000;
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function declaredDate(text, year) {
  const match = String(text).match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) (\d{1,2}) ([A-Za-z]+)(?: (\d{4}))?$/);
  if (!match) return null;
  const month = months.indexOf(match[2]);
  const date = new Date(Date.UTC(Number(match[3] || year), month, Number(match[1])));
  return month >= 0 && date.getUTCMonth() === month && date.getUTCDate() === Number(match[1]) ? date.toISOString().slice(0,10) : null;
}
export function reportCoverage(report) {
  const year = Number(String(report?.date || '').slice(0,4));
  const parts = String(report?.period || '').split(' to ');
  let from = report?.coverage?.from || declaredDate(parts[0], year);
  let to = report?.coverage?.to || declaredDate(parts[1], year);
  // For a frozen December/January span, the end is the latest calendar date
  // no later than publication. No browser-local timezone participates.
  if (!report?.coverage?.to && !/\b\d{4}$/.test(parts[1] || '') && to && report?.date && to > report.date) to = `${year - 1}${to.slice(4)}`;
  if (!report?.coverage?.from && !/\b\d{4}$/.test(parts[0] || '') && from && to && from > to) from = `${Number(to.slice(0,4)) - 1}${from.slice(4)}`;
  const span = from && to ? (Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / DAY + 1 : null;
  const days = Number.isInteger(span) && span > 0 && span <= 31 ? span : null;
  const timeBasis = report?.coverage?.timeBasis || report?.validation?.timeBasis || report?.archiveProvenance?.timeBasis || 'unverified';
  const verifiedDays = report?.validation?.days;
  const complete = days === 7 && verifiedDays === 7 && report.validation.status === 'passed';
  const status = days !== null && days < 7 ? 'partial' : complete ? 'complete' : 'unknown';
  const label = status === 'partial' ? `Partial week · ${days} calendar dates` : complete ? '7-day reporting window' : days ? `${days}-date window · completeness unverified` : 'Reporting coverage unverified';
  const definitionId = report?.coverage?.definitionVersion || report?.archiveProvenance?.definition || 'unverified';
  const modernDefinition = definitionId === 'historical-report-v2';
  const legacyDefinition = definitionId === 'historical-measured-v1';
  return {
    status, label, from, to, days, timeBasis, definitionId,
    detail: `${from && to ? `Declared reporting window: ${from}–${to} (inclusive).` : `Declared reporting window: ${report?.period || 'not preserved'}.`} ${timeBasis === 'unverified' ? 'Day boundaries were not preserved.' : `${timeBasis} day boundaries.`} ${complete ? 'All seven reporting days have a retained passing validation record.' : 'A calendar-date span does not establish complete source-interval coverage.'} ${report?.validation ? 'See the report-specific validation evidence below.' : 'No original report-specific interval-completeness evidence was preserved.'}`,
    definition: modernDefinition ? 'Report basis: transmission-metered generation with NESO solar estimates; renewable numerator is wind, solar and natural hydro, excluding biomass and pumped storage. This differs from the live domestic-generation definition, which includes biomass and excludes embedded estimates.' : legacyDefinition ? 'Legacy report basis: historical generation aggregates with solar estimates. The original renewable grouping used wind, solar and the historical Hydro field, excluding biomass. That Hydro field may include pumped-storage generation; the archived figures have not been corrected to a natural-hydro-only definition. Do not compare this grouping directly with the current live domestic mix.' : 'The original report definition is not fully preserved. Do not assume this archive uses the current live metric definition.',
    validationIssue: report?.date === '2026-09-29' ? 'A later all-days check failed: Hydro totals on 23–28 September included positive pumped-storage output; nuclear on 23 September and wind on 28 September also disagreed with the comparison inputs. This archived report is not validated under the current natural-hydro definition. Its published figures remain unchanged, not a corrected or approved recalculation.' : null,
    diagnosticUrl: report?.date === '2026-09-29' ? '/data/validation/reports/2026-09-29/029d415ac2a976ebea26/manifest.json' : null,
    aggregation: report?.coverage?.aggregation || 'Original aggregation method not independently verified for this publication; figures are preserved, not recalculated.',
  };
}
