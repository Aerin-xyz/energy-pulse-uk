/** GB settlement days start at Europe/London midnight, not always UTC midnight. */
export function settlementStart(date, period = 1) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isInteger(period) ||
    period < 1
  )
    throw new Error("Invalid settlement interval");
  const midnight = Date.parse(`${date}T00:00:00Z`);
  const offset = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(midnight),
  );
  return new Date(
    midnight - offset * 3600000 + (period - 1) * 1800000,
  ).toISOString();
}
export function expectedPeriods(date) {
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
  return (
    (Date.parse(settlementStart(next)) - Date.parse(settlementStart(date))) /
    1800000
  );
}
export function settlementCoordinates(iso) {
  const t=Date.parse(iso);
  if(!Number.isFinite(t))throw new Error('Invalid observation time');
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(t);
  const part=type=>parts.find(p=>p.type===type).value;
  const date=`${part('year')}-${part('month')}-${part('day')}`;
  return {date,period:Math.floor((t-Date.parse(settlementStart(date)))/1800000)+1};
}
