// UTC instants remain the keys; UK wall-clock labels are presentation only.
const options = { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
export function londonClock(value, includeOffset = true) {
  const date = new Date(value);
  if (value == null || !Number.isFinite(date.getTime())) return 'Time unavailable';
  const clock = new Intl.DateTimeFormat('en-GB', options).format(date);
  const zone = new Intl.DateTimeFormat('en-GB', { ...options, timeZoneName: 'short' }).formatToParts(date).find(p => p.type === 'timeZoneName').value;
  const offset = new Intl.DateTimeFormat('en-GB', { ...options, timeZoneName: 'shortOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName').value.replace('GMT', 'UTC');
  return `${clock} ${zone}${includeOffset ? ` (${offset === 'UTC' ? 'UTC+0' : offset})` : ''}`;
}
export function londonTimestamp(value) {
  const date = new Date(value);
  if (value == null || !Number.isFinite(date.getTime())) return 'Time unavailable';
  return `${date.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' })} · ${londonClock(value)}`;
}
