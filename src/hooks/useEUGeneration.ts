import { useEffect, useMemo, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Optional mapping of ENTSO-E psrType codes to display labels
const PSR_LABELS: Record<string,string> = {
  'B01': 'Nuclear',
  'B02': 'Fossil Brown Coal/Lignite',
  'B03': 'Fossil Hard coal',
  'B04': 'Fossil Oil',
  'B05': 'Fossil Gas',
  'B06': 'Biomass',
  'B07': 'Fossil Peat',
  'B08': 'Geothermal',
  'B09': 'Hydro Run-of-river',
  'B10': 'Hydro Water Reservoir',
  'B11': 'Hydro Pumped Storage',
  'B12': 'Marine',
  'B13': 'Other renewable',
  'B14': 'Waste',
  'B15': 'Wind Onshore',
  'B16': 'Wind Offshore',
  'B17': 'Solar',
  'B18': 'Other'
};

type EUCountryMix = {
  code: string;          // e.g. "FR"
  ts?: string | null;    // ISO as-of (optional)
  // mix can come as psrType->MW map OR array of {fuel,value}
  mixByFuel?: Record<string, number>;
  mix?: Array<{ fuel: string; value: number }>;
  ok?: boolean;
};

type UseEUGeneration = {
  countries: Array<{
    code: string;
    asOf?: Date | null;
    totalMW: number;
    mix: Array<{ label: string; mw: number }>;
    ok: boolean;
  }>;
  loading: boolean;
  error: string | null;
  debug?: any;
  refresh: () => Promise<void>;
};

export function useEUGeneration(fetchEnergyData?: () => Promise<any>): UseEUGeneration {
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<UseEUGeneration['countries']>([]);
  const [error, setError] = useState<string|null>(null);
  const [debug, setDebug] = useState<any>(null);
  const { toast } = useToast();

  const normalizeCountry = useCallback((raw: EUCountryMix) => {
    const code = raw?.code ?? '??';
    const asOf = raw?.ts ? new Date(raw.ts) : null;

    // Prefer explicit mix array; else map; else empty
    let entries: Array<{ label: string; mw: number }> = [];
    if (Array.isArray(raw?.mix)) {
      entries = raw!.mix.map(x => ({
        label: PSR_LABELS[x.fuel] ?? x.fuel ?? 'Other',
        mw: Number(x.value) || 0
      }));
    } else if (raw?.mixByFuel && typeof raw.mixByFuel === 'object') {
      entries = Object.entries(raw.mixByFuel).map(([k,v]) => ({
        label: PSR_LABELS[k] ?? k,
        mw: Number(v) || 0
      }));
    }
    // Sum & sort desc
    const totalMW = entries.reduce((s, x) => s + (x.mw || 0), 0);
    entries.sort((a,b) => b.mw - a.mw);

    return {
      code,
      asOf,
      totalMW,
      mix: entries,
      ok: raw?.ok !== false && totalMW > 0
    };
  }, []);

  const extractEU = useCallback((payload: any) => {
    // Try common shapes; do not throw if absent.
    const euCountries =
      (Array.isArray(payload?.euGenerationMix) && payload.euGenerationMix) ||
      (Array.isArray(payload?.eu?.countries) && payload.eu.countries) ||
      [];

    if (!Array.isArray(euCountries) || euCountries.length === 0) {
      return { countries: [], debug: { reason: 'eu-data-missing', keys: Object.keys(payload || {}) } };
    }

    const normalized = euCountries
      .filter(Boolean)
      .map(normalizeCountry);

    return { countries: normalized, debug: { count: normalized.length } };
  }, [normalizeCountry]);

  const doFetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // If a custom fetcher was provided (e.g., your existing energy-data call), use it
      // Otherwise do nothing (we are frontend-only and must not change APIs)
      if (!fetchEnergyData) {
        setCountries([]);
        setDebug({ reason: 'no-fetcher-provided' });
        return;
      }

      const payload = await fetchEnergyData();
      const { countries, debug } = extractEU(payload || {});
      setCountries(countries);
      setDebug(debug);

      // Optional toast on successful update
      if (countries.length > 0) {
        toast({ title: 'EU data updated', description: `Fetched ${countries.length} countries` });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to read EU data');
    } finally {
      setLoading(false);
    }
  }, [extractEU, fetchEnergyData, toast]);

  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, 5 * 60 * 1000); // 5 min
    return () => clearInterval(id);
  }, [doFetch]);

  return { countries, loading, error, debug, refresh: doFetch };
}
