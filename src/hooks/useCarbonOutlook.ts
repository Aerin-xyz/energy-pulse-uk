import { useEffect, useState } from "react";
import { partitionCarbonRegions } from '@/lib/evidence/regionalCarbon.mjs';
export type CarbonPeriod = {
  from: string;
  to: string;
  intensity: { forecast: number; actual?: number | null; index?: string };
};
export type CarbonRegion = {
  regionid: number;
  shortname: string;
  intensity: { forecast: number; index: string };
};
export function useCarbonOutlook() {
  const [state, setState] = useState<{
    periods: CarbonPeriod[];
    regions: CarbonRegion[];
    from: string;
    to: string;
    retrievedAt: string;
    error: boolean;
    forecastError: boolean;
    regionsError: boolean;
    loading: boolean;
  }>({
    periods: [],
    regions: [],
    from: "",
    to: "",
    retrievedAt: "",
    error: false,
    forecastError: false,
    regionsError: false,
    loading: true,
  });
  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    async function refresh() {
      const from = new Date().toISOString().slice(0, 16) + "Z";
      const results = await Promise.allSettled([
        fetch(`https://api.carbonintensity.org.uk/intensity/${from}/fw24h`, {
          signal: controller.signal,
        }).then((r) => {
          if (!r.ok) throw Error("Forecast unavailable");
          return r.json();
        }),
        fetch("https://api.carbonintensity.org.uk/regional", {
          signal: controller.signal,
        }).then((r) => {
          if (!r.ok) throw Error("Regions unavailable");
          return r.json();
        }),
      ]);
      if (!alive) return;
      const forecast =
        results[0].status === "fulfilled" ? results[0].value.data : [];
      const region =
        results[1].status === "fulfilled" ? results[1].value.data?.[0] : null;
      setState({
        periods: forecast || [],
        regions: partitionCarbonRegions(region?.regions || []).ranked,
        from: region?.from || "",
        to: region?.to || "",
        retrievedAt: results[0].status === 'fulfilled' ? new Date().toISOString() : '',
        error: results.some((r) => r.status === "rejected"),
        forecastError: results[0].status === 'rejected',
        regionsError: results[1].status === 'rejected',
        loading: false,
      });
    }
    refresh();
    const timer = setInterval(refresh, 10 * 60 * 1000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return state;
}
