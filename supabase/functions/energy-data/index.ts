import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // stick to 0.168.0 (Supabase scaffold)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BMRS = "https://bmrs.elexon.co.uk/bmrs/api/v1";

type FetchOk<T=any>   = { ok: true;  data: T };
type FetchErr         = { ok: false; status: number; body: string };
type FetchResult<T=any> = FetchOk<T> | FetchErr;

// --- helper: add ?format=json once & 406 self-heal ---
function withJsonFormat(u: string): string {
  try { const url = new URL(u); if (!url.searchParams.has("format")) url.searchParams.set("format","json"); return url.toString(); }
  catch { return u.includes("?") ? `${u}&format=json` : `${u}?format=json`; }
}

async function fetchJSON(url: string): Promise<FetchResult> {
  const base = { Accept: "application/json", "User-Agent": "ether-flow/1.0" } as Record<string,string>;
  let res = await fetch(url, { headers: base, cache: "no-store" });
  if (res.status === 406) {
    const retryUrl = withJsonFormat(url);
    const broaden = { ...base, Accept: "application/json, text/plain, */*" };
    res = await fetch(retryUrl, { headers: broaden, cache: "no-store" });
  }
  const text = await res.text();
  if (!res.ok) {
    console.error("[BMRS] FAIL", { url, status: res.status, body: text.slice(0, 400) });
    return { ok: false, status: res.status, body: text.slice(0, 400) };
  }
  // some endpoints mislabel content-type; try JSON parse anyway
  try { return { ok: true, data: JSON.parse(text) }; }
  catch { return { ok: true, data: text as any }; }
}

// --- parsing helpers (defensive across field names) ---
function asArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray((x as any).data)) return (x as any).data;
  if ((x as any).result?.records && Array.isArray((x as any).result.records)) return (x as any).result.records;
  return [];
}

function pickSP(rows: any[]) {
  const r = rows[0] ?? {};
  const sp_from = r.spFrom ?? r.fromTime ?? r.start ?? r.timeFrom ?? r.from ?? r.periodFrom;
  const sp_to   = r.spTo   ?? r.toTime   ?? r.end   ?? r.timeTo   ?? r.to   ?? r.periodTo;
  return { sp_from, sp_to };
}

function numberish(...candidates: any[]): number|undefined {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// --- colors (unchanged) ---
const ENERGY_COLORS: Record<string,string> = {
  Wind:"#10b981", Nuclear:"#f59e0b", Gas:"#ef4444", Coal:"#374151",
  Hydro:"#3b82f6", Solar:"#fbbf24", Biomass:"#16a34a", Oil:"#1f2937", Other:"#6b7280"
};

const EXCLUDE_FROM_MIX = new Set([
  "INTERCONNECTOR","INTERCONNECTORS","INTERCONNECTOR_EXPORT","INTERCONNECTOR_IMPORT",
  "PUMPED_STORAGE","PS","INTFR","INTIRL","INTNED","INTEW","INTNEM","INTELEC","INTNSL"
]);

function normalizeFuel(f: string): string {
  const t = (f||"").toUpperCase();
  if (t.includes("WIND")) return "Wind";
  if (t.includes("SOLAR")) return "Solar";
  if (t.includes("NUCLEAR")) return "Nuclear";
  if (t.includes("BIOMASS")) return "Biomass";
  if (t.includes("HYDRO") || t === "NPSHYD") return "Hydro";
  if (t === "CCGT" || t === "OCGT" || t.includes("GAS")) return "Gas";
  if (t.includes("COAL")) return "Coal";
  if (t.includes("OIL")) return "Oil";
  return "Other";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 1) Outturn (anchor)
  const outturnR = await fetchJSON(`${BMRS}/generation/outturn/current`);
  if (!outturnR.ok) {
    return new Response(JSON.stringify({ error: "bmrs_outturn_current_failed", detail: outturnR }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const outRows = asArray(outturnR.data);
  if (outRows.length === 0) {
    return new Response(JSON.stringify({ error: "bmrs_outturn_current_empty", sample: outturnR.data }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const { sp_from, sp_to } = pickSP(outRows);

  // 2) Interconnectors
  const icR = await fetchJSON(`${BMRS}/generation/outturn/interconnectors`);
  if (!icR.ok) {
    return new Response(JSON.stringify({ error: "bmrs_interconnectors_failed", detail: icR }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const icRows = asArray(icR.data);
  const interconnectors = icRows.map((r: any) => {
    const name = r.interconnectorName ?? r.name ?? "Unknown";
    const flow = numberish(r.flow, r.mw, r.value) ?? 0;   // + import / - export
    const capacity = numberish(r.capacity, r.cap, r.maxCapacity);
    return { name, country: r.country ?? "", flow, capacity };
  });

  // 3) Demand (national)
  const demandR = await fetchJSON(`${BMRS}/demand/outturn/summary`);
  if (!demandR.ok) {
    return new Response(JSON.stringify({ error: "bmrs_demand_summary_failed", detail: demandR }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const dRows = asArray(demandR.data);
  const national = dRows.find((r: any) => String(r.region ?? r.area ?? "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0] ?? {};
  const totalDemandMW = numberish(national.demand, national.mw, national.value);
  if (!Number.isFinite(totalDemandMW)) {
    return new Response(JSON.stringify({ error: "bmrs_demand_no_national_value", sample: national }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // 4) Build generation mix (exclude IC & pumped)
  let hvWindMW = 0, hvSolarMW = 0, pumpedMW = 0;
  const mixTally: Record<string, number> = {};
  for (const r of outRows) {
    const fuel = String(r.fuelType ?? r.fuel ?? r.fuel_type ?? "").toUpperCase();
    const mw   = numberish(r.generation, r.mw, r.value) ?? 0;

    if (fuel.includes("PUMP")) { pumpedMW += mw; continue; }
    if (fuel.includes("INTERCONNECT")) { continue; }

    if (fuel.includes("WIND")) hvWindMW += mw;
    if (fuel.includes("SOLAR")) hvSolarMW += mw;

    if (!EXCLUDE_FROM_MIX.has(fuel)) {
      const label = normalizeFuel(fuel);
      mixTally[label] = (mixTally[label] || 0) + mw;
    }
  }

  const totalGenerationMW = Object.values(mixTally).reduce((s,v)=>s+v,0);
  const generationMix = Object.entries(mixTally)
    .map(([name, mw]) => ({
      name,
      value: Math.round(mw), // MW
      percentage: totalGenerationMW ? Math.round((mw/totalGenerationMW)*100) : 0,
      color: ENERGY_COLORS[name] || "#6b7280"
    }))
    .sort((a,b)=>b.value-a.value);

  const response = {
    generationMix,
    interconnectors,
    totalGeneration: Math.round((totalGenerationMW/1000) * 100) / 100, // GW
    totalDemand:     Math.round((totalDemandMW/1000)     * 100) / 100, // GW
    lastUpdated: sp_to ?? new Date().toISOString(),
    dataFreshness: { source: "BMRS", spFrom: sp_from, spTo: sp_to }
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
});
