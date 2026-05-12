import { useEffect, useState } from 'react';

export type MarketIndexPrice = {
  priceGBPPerMWh: number;
  volumeMWh: number;
  settlementDate: string;
  settlementPeriod: number;
  startTime: string;
  providers: string[];
  source: string;
  status: string;
};

export type SystemFrequency = {
  hz: number;
  measurementTime: string;
  deviationHz: number;
  status: string;
  source: string;
};

export type StorageStatus = {
  netMW: number;
  absMW: number;
  mode: 'generating' | 'charging' | 'idle';
  label: string;
  timestamp?: string | null;
  source: string;
};

export type GridSignals = {
  marketIndexPrice: MarketIndexPrice | null;
  systemFrequency: SystemFrequency | null;
  storage: StorageStatus | null;
};

const DATA_HOST = 'https://data.elexon.co.uk/bmrs/api/v1';

function parseMarketIndex(rows: Array<Record<string, unknown>>): MarketIndexPrice | null {
  const mapped = rows
    .map((r: Record<string, unknown>) => ({
      startTime: String(r.startTime ?? ''),
      settlementDate: String(r.settlementDate ?? ''),
      settlementPeriod: Number(r.settlementPeriod ?? 0),
      provider: String(r.dataProvider ?? 'MIDP'),
      price: Number(r.price),
      volume: Number(r.volume ?? 0),
    }))
    .filter((r) => r.startTime && Number.isFinite(Date.parse(r.startTime)) && Number.isFinite(r.price));

  if (!mapped.length) return null;
  const latestTime = Math.max(...mapped.map((r) => Date.parse(r.startTime)));
  const latestRows = mapped.filter((r) => Date.parse(r.startTime) === latestTime);
  const positiveVolumeRows = latestRows.filter((r) => r.volume > 0);
  const pricedRows = positiveVolumeRows.length ? positiveVolumeRows : latestRows.filter((r) => r.price > 0);
  if (!pricedRows.length) return null;

  const totalVolume = pricedRows.reduce((sum, r) => sum + (r.volume > 0 ? r.volume : 0), 0);
  const averagePrice = totalVolume > 0
    ? pricedRows.reduce((sum, r) => sum + r.price * r.volume, 0) / totalVolume
    : pricedRows.reduce((sum, r) => sum + r.price, 0) / pricedRows.length;
  const first = pricedRows[0];

  return {
    priceGBPPerMWh: Math.round(averagePrice * 100) / 100,
    volumeMWh: Math.round(totalVolume * 1000) / 1000,
    settlementDate: first.settlementDate,
    settlementPeriod: first.settlementPeriod,
    startTime: new Date(latestTime).toISOString(),
    providers: pricedRows.map((r) => r.provider),
    source: 'Elexon Market Index Price',
    status: 'live',
  };
}

function parseFrequency(rows: Array<Record<string, unknown>>): SystemFrequency | null {
  const mapped = rows
    .map((r: Record<string, unknown>) => ({ measurementTime: String(r.measurementTime ?? ''), frequency: Number(r.frequency) }))
    .filter((r) => r.measurementTime && Number.isFinite(Date.parse(r.measurementTime)) && Number.isFinite(r.frequency));
  if (!mapped.length) return null;
  const latest = mapped.reduce((best, row) => Date.parse(row.measurementTime) > Date.parse(best.measurementTime) ? row : best, mapped[0]);
  return {
    hz: Math.round(latest.frequency * 1000) / 1000,
    measurementTime: new Date(latest.measurementTime).toISOString(),
    deviationHz: Math.round((latest.frequency - 50) * 1000) / 1000,
    status: Math.abs(latest.frequency - 50) <= 0.2 ? 'normal' : 'alert',
    source: 'Elexon system frequency',
  };
}

function parseStorage(rows: Array<Record<string, unknown>>): StorageStatus | null {
  const timed = rows
    .map((row: Record<string, unknown>) => ({ row, time: Date.parse(String(row.startTime ?? row.publishDateTime ?? '')) }))
    .filter((item) => Number.isFinite(item.time));
  if (!timed.length) return null;
  const latestTime = Math.max(...timed.map((item) => item.time));
  const latestRows = timed.filter((item) => item.time === latestTime).map((item) => item.row);
  const netMW = latestRows.reduce((sum, row) => {
    const fuel = String(row.fuelType ?? '').toUpperCase();
    if (fuel !== 'PS' && !fuel.includes('PUMP')) return sum;
    const mw = Number(row.generation);
    return Number.isFinite(mw) ? sum + mw : sum;
  }, 0);
  const mode = netMW > 25 ? 'generating' : netMW < -25 ? 'charging' : 'idle';
  return {
    netMW: Math.round(netMW),
    absMW: Math.round(Math.abs(netMW)),
    mode,
    label: mode === 'generating' ? 'Pumped storage generating' : mode === 'charging' ? 'Pumped storage charging' : 'Pumped storage idle',
    timestamp: new Date(latestTime).toISOString(),
    source: 'Elexon FUELINST pumped storage',
  };
}

export function useGridSignals(seed?: Partial<GridSignals>) {
  const [signals, setSignals] = useState<GridSignals>({
    marketIndexPrice: seed?.marketIndexPrice || null,
    systemFrequency: seed?.systemFrequency || null,
    storage: seed?.storage || null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const now = new Date();
      const from = new Date(now.getTime() - 14 * 60 * 60 * 1000);
      const freqFrom = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const headers = { Accept: 'application/json' };

      const [price, frequency, fuelinst] = await Promise.allSettled([
        seed?.marketIndexPrice ? Promise.resolve(null) : fetch(`${DATA_HOST}/balancing/pricing/market-index?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(now.toISOString())}&format=json`, { headers }).then((r) => r.json()),
        seed?.systemFrequency ? Promise.resolve(null) : fetch(`${DATA_HOST}/system/frequency?from=${encodeURIComponent(freqFrom.toISOString())}&to=${encodeURIComponent(now.toISOString())}&format=json`, { headers }).then((r) => r.json()),
        seed?.storage ? Promise.resolve(null) : fetch(`${DATA_HOST}/datasets/FUELINST/stream?publishDateTimeFrom=${encodeURIComponent(from.toISOString())}&publishDateTimeTo=${encodeURIComponent(now.toISOString())}&format=json`, { headers }).then((r) => r.json()),
      ]);

      if (cancelled) return;
      setSignals((current) => ({
        marketIndexPrice: seed?.marketIndexPrice || current.marketIndexPrice || (price.status === 'fulfilled' ? parseMarketIndex(price.value?.data || price.value || []) : null),
        systemFrequency: seed?.systemFrequency || current.systemFrequency || (frequency.status === 'fulfilled' ? parseFrequency(frequency.value?.data || frequency.value || []) : null),
        storage: seed?.storage || current.storage || (fuelinst.status === 'fulfilled' ? parseStorage(Array.isArray(fuelinst.value) ? fuelinst.value : fuelinst.value?.data || []) : null),
      }));
    }
    load().catch(() => undefined);
    return () => { cancelled = true; };
  }, [seed?.marketIndexPrice, seed?.storage, seed?.systemFrequency]);

  return signals;
}
