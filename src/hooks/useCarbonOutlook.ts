import { useEffect, useState } from "react";
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
  }>({
    periods: [],
    regions: [],
    from: "",
    to: "",
    retrievedAt: "",
    error: false,
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
        regions: (region?.regions || []).filter(
          (r: CarbonRegion) => r.regionid >= 1 && r.regionid <= 14,
        ),
        from: region?.from || "",
        to: region?.to || "",
        retrievedAt: new Date().toISOString(),
        error: results.some((r) => r.status === "rejected"),
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
