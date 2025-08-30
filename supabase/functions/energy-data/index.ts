const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
};

// Debug helpers
function qDebug(url: string): boolean {
  try { return new URL(url).searchParams.get("debug") === "1"; } catch { return false; }
}
function dlog(enabled: boolean, ...args: any[]) { if (enabled) console.log("[energy-data]", ...args); }

// Env flags
const BMRS_FORCE_DATASET = (Deno.env.get("BMRS_FORCE_DATASET") || "").toLowerCase() === "true";

// BMRS base
const BMRS_BASE = "https://bmrs.elexon.co.uk/bmrs/api/v1";

// Strict result type for fetch attempts
type StrictResult =
  | { ok: true; data: any; url: string; status: number; contentType: string; variant: string }
  | { ok: false; url: string; status: number; reason: string; body?: string; contentType?: string; variant: string; redirectedTo?: string };

function withFormat(u: string): string {
  try { const url = new URL(u); url.searchParams.set("format","json"); return url.toString(); }
  catch { return u.includes("?") ? `${u}&format=json` : `${u}?format=json`; }
}

// Browser-like headers reduce WAF surprises
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": UA,
  Origin: "https://bmrs.elexon.co.uk",
  Referer: "https://bmrs.elexon.co.uk/",
  "Accept-Language": "en-GB,en;q=0.9",
} as Record<string,string>;

async function tryOnce(url: string, variant: string): Promise<StrictResult> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", redirect: "manual" as RequestRedirect });
  const ct  = res.headers.get("content-type") || "";
  const text = await res.text();

  if (res.status >= 300 && res.status < 400) {
    return { ok: false, url, status: res.status, reason: "redirect", body: text.slice(0, 300), contentType: ct, variant, redirectedTo: res.headers.get("location") || "" };
  }
  if (!ct.toLowerCase().includes("json")) {
    return { ok: false, url, status: res.status, reason: "non-json", body: text.slice(0, 400), contentType: ct, variant };
  }
  if (!res.ok) {
    return { ok: false, url, status: res.status, reason: "http-error", body: text.slice(0, 400), contentType: ct, variant };
  }
  try { return { ok: true, data: JSON.parse(text), url, status: res.status, contentType: ct, variant }; }
  catch { return { ok: false, url, status: 200, reason: "json-parse-failed", body: text.slice(0, 200), contentType: ct, variant }; }
}

// Resolver: prefer SUMMARY → CURRENT
async function fetchBMRS(path: string): Promise<StrictResult> {
  const variants: { v: string; url: string }[] = [
    { v: "insights-summary", url: withFormat(`${BMRS_BASE}${path.replace("/current","/summary")}`) },
    { v: "insights-current", url: withFormat(`${BMRS_BASE}${path}`) },
  ];
  for (const { v, url } of variants) {
    const r = await tryOnce(url, v);
    if (r.ok) return r;
  }
  return { ok: false, url: variants[0].url, status: 502, reason: "all-variants-non-json", variant: "exhausted" };
}

// Dedicated dataset fetcher (FUELHH stream)
async function fetchFUELHHStream(limit = 200) {
  const url = `https://bmrs.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?limit=${limit}&format=json`;
  const res = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
    redirect: "manual" as RequestRedirect,
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!ct.toLowerCase().includes("json") || !res.ok) {
    return { ok: false, status: res.status, reason: "fuelhh-non-json", contentType: ct, body: text.slice(0, 400) };
  }
  try { return { ok: true, data: JSON.parse(text) }; }
  catch { return { ok: false, status: 200, reason: "fuelhh-parse-fail", body: text.slice(0, 200) }; }
}

// Helpers: robust array extraction and flexible field picking
function asArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray((x as any).data)) return (x as any).data;
  if ((x as any).result?.records && Array.isArray((x as any).result.records)) return (x as any).result.records;
  if ((x as any).items && Array.isArray((x as any).items)) return (x as any).items;
  return [];
}
function pickNum(row: any, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}
function pickStr(row: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

// Colors for frontend charts
const COLORS: Record<string,string> = { Wind:"#10b981", Nuclear:"#f59e0b", Gas:"#ef4444", Coal:"#374151", Hydro:"#3b82f6", Solar:"#fbbf24", Biomass:"#16a34a", Oil:"#1f2937", Other:"#6b7280" };

function mapFuelLabel(f: string): string {
  const t = (f||"").toUpperCase();
  if (t.includes("WIND")) return "Wind";
  if (t.includes("SOLAR") || t.includes("PV")) return "Solar";
  if (t.includes("NUCLEAR")) return "Nuclear";
  if (t.includes("BIOMASS")) return "Biomass";
  if (t.includes("HYDRO") || t === "NPSHYD") return "Hydro";
  if (t === "CCGT" || t === "OCGT" || t.includes("GAS")) return "Gas";
  if (t.includes("COAL")) return "Coal";
  if (t.includes("OIL")) return "Oil";
  return "Other";
}

// Parse generation from FUELHH stream (MWh → MW)
function parseFUELHH(data: any, DEBUG=false) {
  const rows = asArray(data);
  if (DEBUG) dlog(true, "FUELHH rows:", rows.length, "sample:", rows[0]);

  rows.sort((a,b) => new Date(
    pickStr(a, ["SP_END","SP_TO","SETTLEMENT_PERIOD_END","timeTo","spTo"]) || 0
  ).getTime() - new Date(
    pickStr(b, ["SP_END","SP_TO","SETTLEMENT_PERIOD_END","timeTo","spTo"]) || 0
  ).getTime());

  const lastEnd = pickStr(rows[rows.length-1] || {}, ["SP_END","SP_TO","SETTLEMENT_PERIOD_END","timeTo","spTo"]);
  const latest = rows.filter(r =>
    pickStr(r, ["SP_END","SP_TO","SETTLEMENT_PERIOD_END","timeTo","spTo"]) === lastEnd
  );

  const mixMW: Record<string, number> = {};
  for (const r of latest) {
    const fuelRaw = pickStr(r, ["FUEL_TYPE","FUELTYPE","fuel","fuelType","name"]) || "";
    const mwh = pickNum(r, ["MWH","ENERGY_MWH","mwh","energy"]) ?? 0;
    const mw = mwh * 2; // half-hour MWh → MW
    const t = fuelRaw.toUpperCase();
    if (t.includes("INTERCONNECT") || t.startsWith("INT") || t.includes("PUMP")) continue;
    const L = mapFuelLabel(fuelRaw);
    mixMW[L] = (mixMW[L] || 0) + mw;
  }

  const totalMW = Object.values(mixMW).reduce((s,v)=>s+v,0);
  return { mixMW, totalMW, spTo: lastEnd };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DEBUG = qDebug(req.url);

  // Helper to insert LKG only on real data
  async function insertLKG(as_of: string, payload: any, guardMW: number) {
    if (!(guardMW > 0)) return;
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supa = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supa.from("energy_data_history").insert({ as_of, payload });
    } catch (e) {
      if (DEBUG) dlog(true, "LKG insert failed", e);
    }
  }

  // Interconnectors and demand parsers (tolerant)
  function parseInterconnectors(icData: any) {
    const icRows = asArray(icData);
    return icRows.map((r: any) => ({
      name:     pickStr(r, ["interconnectorName","name","connector","id"]) || "Unknown",
      country:  pickStr(r, ["country","counterparty","partner"]) || "",
      flow:     pickNum(r, ["flow","flowMW","mw","value","ieFlow","actualFlowMW"]) ?? 0,
      capacity: pickNum(r, ["capacity","cap","maxCapacity","capacityMW"]),
    }));
  }
  function parseDemand(dData: any): number {
    const dRows = asArray(dData);
    const national = dRows.find((r:any) => String(pickStr(r, ["region","area","name"]) || "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0] ?? {};
    const totalDemandMW = pickNum(national, ["demand","demandMW","mw","value","totalDemandMW"]) ?? 0;
    return Math.round((totalDemandMW/1000)*100)/100;
  }

  // Branch 1: Forced dataset mode
  if (BMRS_FORCE_DATASET) {
    const ds = await fetchFUELHHStream(200);
    if (DEBUG) dlog(true, "BMRS_FORCE_DATASET fetch:", { ok: (ds as any).ok, reason: (ds as any).reason });

    if (ds.ok) {
      const parsed = parseFUELHH(ds.data, DEBUG);
      const generationMix = Object.entries(parsed.mixMW).map(([name, mw]) => ({
        name,
        value: Math.round(mw as number),
        percentage: parsed.totalMW ? Math.round(((mw as number)/parsed.totalMW)*100) : 0,
        color: COLORS[name] || "#6b7280",
      })).sort((a,b)=>b.value-a.value);

      // Try IC and Demand but don't fail payload if they break
      const [icR, demandR] = await Promise.all([
        fetchBMRS("/generation/outturn/interconnectors"),
        fetchBMRS("/demand/outturn/summary"),
      ]);
      if (DEBUG) dlog(true, "ic/demand in dataset mode:", { icOk: icR.ok, dOk: demandR.ok });

      const interconnectors = icR.ok ? parseInterconnectors(icR.data) : [];
      const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

      const payload: any = {
        generationMix,
        interconnectors,
        totalGeneration: Math.round((parsed.totalMW/1000)*100)/100,
        totalDemand,
        lastUpdated: parsed.spTo || new Date().toISOString(),
        dataFreshness: { source: "BMRS", isRealtime: true, variant: "dataset-fuelhh-stream" },
      };
      if (DEBUG) payload.diagnostics = { genVariant: "dataset-fuelhh-stream", totalFuels: Object.keys(parsed.mixMW).length, spTo: parsed.spTo };

      await insertLKG(payload.lastUpdated, payload, parsed.totalMW);

      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
    }

    // dataset failed → try LKG → stub
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supa = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: lkgRow } = await supa
        .from("energy_data_history")
        .select("payload")
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lkgRow?.payload) {
        const lkg = lkgRow.payload;
        lkg.dataFreshness = { ...(lkg.dataFreshness||{}), isRealtime: false, note: "Dataset failed; served LKG" };
        return new Response(JSON.stringify(lkg), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
      }
    } catch {}

    const stub = { generationMix: [], interconnectors: [], totalGeneration: 0, totalDemand: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: dataset failed" } };
    return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
  }

  // Branch 2: Resolver → dataset → LKG → stub
  const [outturnR, icR, demandR] = await Promise.all([
    fetchBMRS("/generation/outturn/current"),
    fetchBMRS("/generation/outturn/interconnectors"),
    fetchBMRS("/demand/outturn/summary"),
  ]);
  if (DEBUG) dlog(true, "resolver results:", { outturn: { ok: outturnR.ok, variant: outturnR.variant, status: (outturnR as any).status }, ic: { ok: icR.ok, variant: icR.variant }, demand: { ok: demandR.ok, variant: demandR.variant } });

  // Parse generation from resolver if available; else dataset fallback
  let genVariant = "none";
  let mixMW: Record<string,number> = {};
  let totalGenerationMW = 0;
  let spTo: string | null = null;

  if (outturnR.ok) {
    genVariant = outturnR.variant;
    const outRows = asArray(outturnR.data);
    if (DEBUG) dlog(true, "outturn rows:", outRows.length, "sample:", outRows[0]);

    outRows.sort((a,b)=> new Date(pickStr(a,["spTo","toTime","timeTo","periodEnd","validTo"])||0).getTime() - new Date(pickStr(b,["spTo","toTime","timeTo","periodEnd","validTo"])||0).getTime());
    const lastEnd = pickStr(outRows[outRows.length-1]||{}, ["spTo","toTime","timeTo","periodEnd","validTo"]);
    const latest = outRows.filter(r => pickStr(r,["spTo","toTime","timeTo","periodEnd","validTo"]) === lastEnd);

    for (const r of latest) {
      const fuelRaw = pickStr(r, ["fuelType","fuel","fuel_type","FUELTYPE","name"]) || "";
      const t = fuelRaw.toUpperCase();
      if (t.includes("INTERCONNECT") || t.startsWith("INT") || t.includes("PUMP")) continue;
      const mw = pickNum(r, ["generation","generationMW","mw","value","actual","power","powerMW","measuredMW"]) ?? 0;
      const L = mapFuelLabel(fuelRaw);
      mixMW[L] = (mixMW[L] || 0) + mw;
    }
    totalGenerationMW = Object.values(mixMW).reduce((s,v)=>s+v,0);
    spTo = lastEnd || null;
  } else {
    const ds = await fetchFUELHHStream(200);
    if (ds.ok) {
      const parsed = parseFUELHH(ds.data, DEBUG);
      mixMW = parsed.mixMW; totalGenerationMW = parsed.totalMW; spTo = parsed.spTo || null; genVariant = "dataset-fuelhh-stream";
    }
  }

  if (totalGenerationMW === 0) {
    // Try LKG before stub
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supa = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: lkgRow } = await supa
        .from("energy_data_history")
        .select("payload")
        .order("as_of", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lkgRow?.payload) {
        const lkg = lkgRow.payload;
        lkg.dataFreshness = { ...(lkg.dataFreshness||{}), isRealtime: false, note: "Resolver failed; served LKG" };
        if (DEBUG) lkg.diagnostics = { genVariant, resolverFailed: true };
        return new Response(JSON.stringify(lkg), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
      }
    } catch {}

    // Final stub
    const stub = { generationMix: [], interconnectors: [], totalGeneration: 0, totalDemand: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: all sources failed", variant: genVariant } };
    return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
  }

  // Build generation mix
  const generationMix = Object.entries(mixMW).map(([name, mw]) => ({
    name,
    value: Math.round(mw as number),
    percentage: totalGenerationMW ? Math.round(((mw as number)/totalGenerationMW)*100) : 0,
    color: COLORS[name] || "#6b7280",
  })).sort((a,b)=>b.value-a.value);

  // Interconnectors & Demand (best-effort)
  const interconnectors = icR.ok ? parseInterconnectors(icR.data) : [];
  const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

  const payload: any = {
    generationMix,
    interconnectors,
    totalGeneration: Math.round((totalGenerationMW/1000)*100)/100,
    totalDemand,
    lastUpdated: spTo || new Date().toISOString(),
    dataFreshness: { source: "BMRS", isRealtime: true, variant: genVariant },
  };
  if (DEBUG) payload.diagnostics = { genVariant, fuels: Object.keys(mixMW).length, spTo };

  await insertLKG(payload.lastUpdated, payload, totalGenerationMW);

  return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
});