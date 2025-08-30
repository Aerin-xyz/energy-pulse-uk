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

// Extended helpers to pick with key tracking
function pickNumWithKey(row: any, keys: string[]): { value?: number; key?: string } {
  for (const k of keys) {
    const v = row?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return { value: n, key: k };
  }
  return {};
}
function pickStrWithKey(row: any, keys: string[]): { value?: string; key?: string } {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return { value: v, key: k };
  }
  return {};
}

function normalizeFuelRow(row: any) {
  const fuelPick = pickStrWithKey(row, ["fuelType","FUEL_TYPE","fuel","FUEL","FUELTYPE","name"]);
  const genPick = pickNumWithKey(row, ["generation","GENERATION_MW","generationMW","mw","value","actual","power","powerMW","measuredMW"]);
  let mw: number | null = null;
  let mwKey: string | undefined;
  let fromMWh = false;

  if (typeof genPick.value === "number") {
    mw = genPick.value;
    mwKey = genPick.key;
  } else {
    const mwhPick = pickNumWithKey(row, ["MWH","ENERGY_MWH","mwh","energy"]);
    if (typeof mwhPick.value === "number") {
      mw = mwhPick.value * 2; // half-hour MWh → MW
      mwKey = mwhPick.key;
      fromMWh = true;
    }
  }

  const fuelRaw = fuelPick.value || "Other";
  const fuelLabel = mapFuelLabel(fuelRaw);
  return { fuelRaw, fuelKey: fuelPick.key, mw, mwKey, fromMWh, fuelLabel };
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
  const sample = latest.slice(0, 3);
  for (const r of latest) {
    const norm = normalizeFuelRow(r);
    const t = (norm.fuelRaw || "").toUpperCase();
    if (t.includes("INTERCONNECT") || t.startsWith("INT") || t.includes("PUMP") || t === "PS") continue;
    if (norm.mw == null || !Number.isFinite(norm.mw)) continue;
    const L = norm.fuelLabel;
    mixMW[L] = (mixMW[L] || 0) + (norm.mw as number);
  }

  const totalMW = Object.values(mixMW).reduce((s,v)=>s+v,0);
  return { mixMW, totalMW, spTo: lastEnd, sample };
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
      const parsed = parseFUELHH(ds.data, DEBUG);
      const generationMix = Object.entries(parsed.mixMW).map(([name, mw]) => ({
        name,
        value: Math.round(mw as number),
        percentage: parsed.totalMW ? Math.round(((mw as number)/parsed.totalMW)*100) : 0,
        color: COLORS[name] || "#6b7280",
      })).sort((a,b)=>b.value-a.value);

      // Try IC and Demand but don't fail payload if they break
      const [icR, demandR] = await Promise.all([
        fetchInterconnectors(),
        fetchDemand(),
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
      if (DEBUG) payload.diagnostics = { genVariant: "dataset-fuelhh-stream", totalFuels: Object.keys(parsed.mixMW).length, spTo: parsed.spTo, sample: parsed.sample };

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
    fetchInterconnectors(),
    fetchDemand(),
  ]);
  if (DEBUG) dlog(true, "resolver results:", { outturn: { ok: outturnR.ok, variant: outturnR.variant, status: (outturnR as any).status }, ic: { ok: icR.ok }, demand: { ok: demandR.ok } });

  // Parse generation from resolver if available; else dataset fallback
  let genVariant = "none";
  let mixMW: Record<string,number> = {};
  let totalGenerationMW = 0;
  let spTo: string | null = null;
  let diagSample: any[] = [];

  if (outturnR.ok) {
    genVariant = outturnR.variant;
    const outRows = asArray(outturnR.data);
    if (DEBUG) dlog(true, "outturn rows:", outRows.length, "sample:", outRows[0]);

    outRows.sort((a,b)=> new Date(pickStr(a,["spTo","toTime","timeTo","periodEnd","validTo"])||0).getTime() - new Date(pickStr(b,["spTo","toTime","timeTo","periodEnd","validTo"])||0).getTime());
    const lastEnd = pickStr(outRows[outRows.length-1]||{}, ["spTo","toTime","timeTo","periodEnd","validTo"]);
    const latest = outRows.filter(r => pickStr(r,["spTo","toTime","timeTo","periodEnd","validTo"]) === lastEnd);

    const sample = latest.slice(0, 3);
    diagSample = sample;
    for (const r of latest) {
      const norm = normalizeFuelRow(r);
      const t = (norm.fuelRaw || "").toUpperCase();
      if (t.includes("INTERCONNECT") || t.startsWith("INT") || t.includes("PUMP") || t === "PS") continue;
      if (norm.mw == null || !Number.isFinite(norm.mw)) continue;
      const L = norm.fuelLabel;
      mixMW[L] = (mixMW[L] || 0) + (norm.mw as number);
    }
    totalGenerationMW = Object.values(mixMW).reduce((s,v)=>s+v,0);
    spTo = lastEnd || null;
  } else {
    const ds = await fetchFUELHHStream(200);
    if (ds.ok) {
      const parsed = parseFUELHH(ds.data, DEBUG);
      mixMW = parsed.mixMW; totalGenerationMW = parsed.totalMW; spTo = parsed.spTo || null; genVariant = "dataset-fuelhh-stream";
      diagSample = parsed.sample || [];
    }
  }

  if (totalGenerationMW === 0) {
    // Try dataset fallback
    if (DEBUG) dlog(true, "Trying dataset fallback...");
    const ds = await fetchFUELHHStream(200);
    if (ds.ok) {
      const parsed = parseFUELHH(ds.data, DEBUG);
      mixMW = parsed.mixMW; 
      totalGenerationMW = parsed.totalMW; 
      spTo = parsed.spTo || null; 
      genVariant = "dataset-fuelhh-stream";
      diagSample = parsed.sample || [];
      if (DEBUG) dlog(true, "Dataset fallback succeeded:", { totalMW: totalGenerationMW, fuels: Object.keys(mixMW).length });
    } else {
      if (DEBUG) dlog(true, "Dataset fallback failed:", { reason: ds.reason });
      
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
          lkg.dataFreshness = { ...(lkg.dataFreshness||{}), isRealtime: false, note: "All sources failed; served LKG" };
          if (DEBUG) lkg.diagnostics = { genVariant, resolverFailed: true, datasetFailed: true };
          return new Response(JSON.stringify(lkg), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
        }
      } catch {}

      // Final stub (only if no LKG)
      const stub = { generationMix: [], interconnectors: [], totalGeneration: 0, totalDemand: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: all sources failed", variant: genVariant } };
      if (DEBUG) stub.diagnostics = { genVariant, allSourcesFailed: true };
      return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
    }
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
  if (DEBUG) payload.diagnostics = { genVariant, fuels: Object.keys(mixMW).length, spTo, sample: diagSample };

  await insertLKG(payload.lastUpdated, payload, totalGenerationMW);

  return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" } });
});