// Named report metrics, never positions in an optional highlight array.
export function topicEvidence(report, topic) {
 const period=report?.period;
 if (!period || report?.validation?.status !== 'passed') return 'No validated historical context is available.';
 if(topic==='solar') {
  const m=report.modules?.solar;
  return m?.status==='passed' && Number.isFinite(m.averageMW) ? `Embedded solar averaged ${(m.averageMW/1000).toFixed(2)} GW across ${period}; NESO estimate, excluded from transmission-metered generation totals. Provisional and source-revisable.` : `Solar estimates are unavailable for ${period}; missing estimates are not zero.`;
 }
 const label=topic==='wind'?'Highest daily-average metered wind':'Highest daily-average metered gas';
 const metric=report.metrics?.find(([name])=>name===label);
 return metric ? `${label}: ${metric[1]}. Reporting window: ${period}. This is a daily average, not instantaneous output or an all-time record. Provisional and source-revisable.` : `Validated metered ${topic} context is unavailable for ${period}.`;
}
