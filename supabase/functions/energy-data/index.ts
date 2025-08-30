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
const BMRS_PRIMARY_HOST = Deno.env.get("BMRS_PRIMARY_HOST") || "data.elexon.co.uk";

// BMRS hosts (primary and fallback)
const DATA_HOST = "data.elexon.co.uk";
const BMRS_HOST = "bmrs.elexon.co.uk";

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
  Accept: "application/json",
  "User-Agent": UA,
  Origin: "https://bmrs.elexon.co.uk",
  Referer: "https://bmrs.elexon.co.uk/",
  "Accept-Language": "en-GB",
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

// Dual-host resolver: prefer DATA → BMRS, SUMMARY → CURRENT
async function fetchBMRS(path: string): Promise<StrictResult> {
  const hosts = BMRS_PRIMARY_HOST === DATA_HOST ? [DATA_HOST, BMRS_HOST] : [BMRS_HOST, DATA_HOST];
  const variants: { v: string; url: string }[] = [];
  
  for (const host of hosts) {
    const base = `https://${host}/bmrs/api/v1`;
    const hostPrefix = host === DATA_HOST ? "data" : "bmrs";
    variants.push(
      { v: `insights-summary@${hostPrefix}`, url: withFormat(`${base}${path.replace("/current","/summary")}`) },
      { v: `insights-current@${hostPrefix}`, url: withFormat(`${base}${path}`) }
    );
  }
  
  for (const { v, url } of variants) {
    const r = await tryOnce(url, v);
    if (r.ok) return r;
  }
  return { ok: false, url: variants[0].url, status: 502, reason: "all-variants-non-json", variant: "exhausted" };
}

// Dedicated dataset fetcher (FUELHH stream) - try both hosts
async function fetchFUELHHStream(limit = 200) {
  const hosts = BMRS_PRIMARY_HOST === DATA_HOST ? [DATA_HOST, BMRS_HOST] : [BMRS_HOST, DATA_HOST];
  
  for (const host of hosts) {
    const url = `https://${host}/bmrs/api/v1/datasets/FUELHH/stream?limit=${limit}&format=json`;
    const res = await fetch(url, {
      headers: HEADERS,
      cache: "no-store",
      redirect: "manual" as RequestRedirect,
    });
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    if (ct.toLowerCase().includes("json") && res.ok) {
      try { 
        return { ok: true, data: JSON.parse(text), host }; 
      } catch { 
        continue; // Try next host
      }
    }
  }
  return { ok: false, status: 502, reason: "fuelhh-all-hosts-failed" };
}

// Fetch interconnectors with dual host support
async function fetchInterconnectors() {
  const hosts = BMRS_PRIMARY_HOST === DATA_HOST ? [DATA_HOST, BMRS_HOST] : [BMRS_HOST, DATA_HOST];
  
  for (const host of hosts) {
    const url = `https://${host}/bmrs/api/v1/balancing/interconnector/summary/latest?format=json`;
    try {
      const res = await fetch(url, { headers: HEADERS, cache: "no-store", redirect: "manual" as RequestRedirect });
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      if (ct.toLowerCase().includes("json") && res.ok) {
        return { ok: true, data: JSON.parse(text), host };
      }
    } catch { continue; }
  }
  return { ok: false, reason: "interconnectors-all-hosts-failed" };
}

// Fetch demand with dual host support
async function fetchDemand() {
  const hosts = BMRS_PRIMARY_HOST === DATA_HOST ? [DATA_HOST, BMRS_HOST] : [BMRS_HOST, DATA_HOST];
  
  for (const host of hosts) {
    const url = `https://${host}/bmrs/api/v1/demand/outturn/summary?format=json`;
    try {
      const res = await fetch(url, { headers: HEADERS, cache: "no-store", redirect: "manual" as RequestRedirect });
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      if (ct.toLowerCase().includes("json") && res.ok) {
        return { ok: true, data: JSON.parse(text), host };
      }
    } catch { continue; }
  }
  return { ok: false, reason: "demand-all-hosts-failed" };
}

// Helpers: robust array extraction
function asArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray((x as any).data)) return (x as any).data;
  if ((x as any).result?.records && Array.isArray((x as any).result.records)) return (x as any).result.records;
  if ((x as any).items && Array.isArray((x as any).items)) return (x as any).items;
  return [];
}

type Variant = "insights-summary" | "insights-current" | "dataset-fuelhh-stream";

function pickLatestSP(rows: any[]) {
  const getDate = (r: any) => r.SETTLEMENT_DATE || r.settlementDate || r.SettlementDate;
  const getSP = (r: any) => r.SETTLEMENT_PERIOD || r.settlementPeriod || r.SettlementPeriod;

  // Normalise to comparable numeric key: YYYYMMDD * 100 + SP
  const key = (r: any) => {
    const d = String(getDate(r) ?? "").replace(/[-/]/g, "");         // "2025-08-30" → "20250830"
    const sp = Number(getSP(r) ?? NaN);
    if (!d || !Number.isFinite(sp)) return -1;
    return Number(d) * 100 + sp;
  };

  // Find max key
  let maxKey = -1;
  for (const r of rows) { maxKey = Math.max(maxKey, key(r)); }
  return rows.filter(r => key(r) === maxKey);
}

const EXCLUDE = /INTERCONNECT|^INT|PUMP|^PS$/i;

const COLORS: Record<string, string> = { Wind: "#10b981", Nuclear: "#f59e0b", Gas: "#ef4444", Coal: "#374151", Hydro: "#3b82f6", Solar: "#fbbf24", Biomass: "#16a34a", Oil: "#1f2937", Other: "#6b7280" };

function labelFuel(raw: string): string {
  const t = (raw || "").toUpperCase();
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

function parseInsightsMW(rows: any[]) {
  const latest = pickLatestSP(rows);
  const mixMW: Record<string, number> = {};

  for (const r of latest) {
    const fuelRaw = r.fuelType ?? r.fuel ?? r.FUEL_TYPE ?? r.name ?? "";
    if (EXCLUDE.test(fuelRaw)) continue;

    const mw = Number(r.generation ?? r.generationMW ?? r.GENERATION_MW ?? r.value ?? r.actual);
    if (!Number.isFinite(mw)) continue;

    const L = labelFuel(fuelRaw);
    mixMW[L] = (mixMW[L] || 0) + mw;  // already MW
  }
  return mixMW;
}

function parseFUELHHtoMW(rows: any[]) {
  const latest = pickLatestSP(rows);
  const mixMW: Record<string, number> = {};

  for (const r of latest) {
    const fuelRaw = r.FUEL_TYPE ?? r.FUELTYPE ?? r.fuel ?? r.fuelType ?? r.name ?? "";
    if (EXCLUDE.test(fuelRaw)) continue;

    const mwh = Number(r.MWH ?? r.ENERGY_MWH);
    if (!Number.isFinite(mwh)) continue;

    const mw = mwh * 2; // 30-min energy → MW
    const L = labelFuel(fuelRaw);
    mixMW[L] = (mixMW[L] || 0) + mw;
  }
  return mixMW;
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

  // Helper to serve LKG data
  async function serveLKG(note: string) {
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
        lkg.dataFreshness = { ...(lkg.dataFreshness || {}), isRealtime: false, note };
        return new Response(JSON.stringify(lkg), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
    } catch {}
    return null;
  }

  // Helper functions for parsing
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

  // Interconnectors and demand parsers (tolerant)
  function parseInterconnectors(icData: any) {
    const icRows = asArray(icData);
    return icRows.map((r: any) => ({
      name:     pickStr(r, ["interconnectorName","name","connector","id"]) || "Unknown",
      country:  pickStr(r, ["country","counterparty","partner","area"]) || "",
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
      const rows = asArray(ds.data);
      if (DEBUG) dlog(true, "FUELHH rows:", rows.length, "sample:", rows[0]);
      
      const mixMW = parseFUELHHtoMW(rows);
      const totalMW = Object.values(mixMW).reduce((s, v) => s + v, 0);
      
      // Sanity guard
      if (totalMW < 10_000 || totalMW > 80_000) {
        if (DEBUG) dlog(true, "Implausible total MW:", totalMW);
        const lkgResponse = await serveLKG("Implausible dataset total; served LKG");
        if (lkgResponse) return lkgResponse;
        
        const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: implausible dataset total", variant: "dataset-fuelhh-stream" } };
        if (DEBUG) stub.diagnostics = { reason: "implausible-total", totalMW, variant: "dataset-fuelhh-stream" };
        return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }

      const generationMix = Object.entries(mixMW).map(([name, mw]) => ({
        name,
        value: Math.round(mw),
        percentage: totalMW ? Math.round((mw / totalMW) * 100) : 0,
        color: COLORS[name] || "#6b7280",
      })).sort((a, b) => b.value - a.value);

      // Try IC and Demand but don't fail payload if they break
      const [icR, demandR] = await Promise.all([
        fetchInterconnectors(),
        fetchDemand(),
      ]);
      if (DEBUG) dlog(true, "ic/demand in dataset mode:", { icOk: icR.ok, dOk: demandR.ok });

      const interconnectors = icR.ok ? parseInterconnectors(icR.data) : [];
      const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

      const latestSample = pickLatestSP(rows).slice(0, 2);
      const payload: any = {
        generationMix,
        interconnectors,
        totalGenerationMW: Math.round(totalMW),
        totalDemandMW: Math.round(totalDemand * 1000), // Convert GW to MW
        units: "MW",
        lastUpdated: new Date().toISOString(),
        dataFreshness: { source: "BMRS", isRealtime: true, variant: "dataset-fuelhh-stream" },
      };
      if (DEBUG) payload.diagnostics = { variant: "dataset-fuelhh-stream", totalFuels: Object.keys(mixMW).length, totalMW, latestSample };

      await insertLKG(payload.lastUpdated, payload, totalMW);

      return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    // dataset failed → try LKG → stub
    const lkgResponse = await serveLKG("Dataset failed; served LKG");
    if (lkgResponse) return lkgResponse;

    const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: dataset failed" } };
    return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }

  // Branch 2: Resolver → dataset → LKG → stub
  const [outturnR, icR, demandR] = await Promise.all([
    fetchBMRS("/generation/outturn/current"),
    fetchInterconnectors(),
    fetchDemand(),
  ]);
  if (DEBUG) dlog(true, "resolver results:", { outturn: { ok: outturnR.ok, variant: outturnR.variant, status: (outturnR as any).status }, ic: { ok: icR.ok }, demand: { ok: demandR.ok } });

  // Parse generation from resolver if available; else dataset fallback
  let genVariant: Variant = "insights-current";
  let mixMW: Record<string, number> = {};
  let totalMW = 0;
  let spTo: string | null = null;
  let diagSample: any[] = [];

  if (outturnR.ok) {
    genVariant = outturnR.variant as Variant;
    const outRows = asArray(outturnR.data);
    if (DEBUG) dlog(true, "outturn rows:", outRows.length, "sample:", outRows[0]);

    mixMW = parseInsightsMW(outRows);
    totalMW = Object.values(mixMW).reduce((s, v) => s + v, 0);
    diagSample = pickLatestSP(outRows).slice(0, 2);
  } else {
    const ds = await fetchFUELHHStream(200);
    if (ds.ok) {
      const rows = asArray(ds.data);
      mixMW = parseFUELHHtoMW(rows);
      totalMW = Object.values(mixMW).reduce((s, v) => s + v, 0);
      genVariant = "dataset-fuelhh-stream";
      diagSample = pickLatestSP(rows).slice(0, 2);
    }
  }

  // Sanity guard
  if (totalMW < 10_000 || totalMW > 80_000) {
    if (DEBUG) dlog(true, "Implausible total MW:", totalMW);
    const lkgResponse = await serveLKG("Implausible total; served LKG");
    if (lkgResponse) return lkgResponse;
    
    const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: implausible total", variant: genVariant } };
    if (DEBUG) stub.diagnostics = { reason: "implausible-total", totalMW, variant: genVariant };
    return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }

  if (totalMW === 0) {
    // Try dataset fallback
    if (DEBUG) dlog(true, "Trying dataset fallback...");
    const ds = await fetchFUELHHStream(200);
    if (ds.ok) {
      const rows = asArray(ds.data);
      mixMW = parseFUELHHtoMW(rows);
      totalMW = Object.values(mixMW).reduce((s, v) => s + v, 0);
      genVariant = "dataset-fuelhh-stream";
      diagSample = pickLatestSP(rows).slice(0, 2);
      if (DEBUG) dlog(true, "Dataset fallback succeeded:", { totalMW, fuels: Object.keys(mixMW).length });
    } else {
      if (DEBUG) dlog(true, "Dataset fallback failed:", { reason: ds.reason });
      
      // Try LKG before stub
      const lkgResponse = await serveLKG("All sources failed; served LKG");
      if (lkgResponse) return lkgResponse;

      // Final stub (only if no LKG)
      const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: all sources failed", variant: genVariant } };
      if (DEBUG) stub.diagnostics = { variant: genVariant, allSourcesFailed: true };
      return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
  }

  // Build generation mix
  const generationMix = Object.entries(mixMW).map(([name, mw]) => ({
    name,
    value: Math.round(mw),
    percentage: totalMW ? Math.round((mw / totalMW) * 100) : 0,
    color: COLORS[name] || "#6b7280",
  })).sort((a, b) => b.value - a.value);

  // Interconnectors & Demand (best-effort)
  const interconnectors = icR.ok ? parseInterconnectors(icR.data) : [];
  const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

  const payload: any = {
    generationMix,
    interconnectors,
    totalGenerationMW: Math.round(totalMW),
    totalDemandMW: Math.round(totalDemand * 1000), // Convert GW to MW
    units: "MW",
    lastUpdated: new Date().toISOString(),
    dataFreshness: { source: "BMRS", isRealtime: true, variant: genVariant },
  };
  if (DEBUG) payload.diagnostics = { variant: genVariant, fuels: Object.keys(mixMW).length, totalMW, latestSample: diagSample };

  await insertLKG(payload.lastUpdated, payload, totalMW);

  return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});