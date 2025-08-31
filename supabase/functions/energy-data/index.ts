const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
};

// Debug helpers
function qDebug(url: string): boolean {
  try { return new URL(url).searchParams.get("debug") === "1"; } catch { return false; }
}
function dlog(enabled: boolean, ...args: any[]) { if (enabled) console.log("[energy-data]", ...args); }

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

// Dual-host resolver for BMRS generation outturn
async function fetchBMRSGeneration(): Promise<StrictResult> {
  const hosts = [DATA_HOST, BMRS_HOST];
  const variants: { v: string; url: string }[] = [];
  
  for (const host of hosts) {
    const base = `https://${host}/bmrs/api/v1`;
    const hostPrefix = host === DATA_HOST ? "data" : "bmrs";
    variants.push(
      { v: `outturn-summary@${hostPrefix}`, url: withFormat(`${base}/generation/outturn/summary`) },
      { v: `outturn-current@${hostPrefix}`, url: withFormat(`${base}/generation/outturn/current`) }
    );
  }
  
  for (const { v, url } of variants) {
    const r = await tryOnce(url, v);
    if (r.ok) return r;
  }
  return { ok: false, url: variants[0].url, status: 502, reason: "all-variants-failed", variant: "exhausted" };
}

// Fetch ESO embedded wind from CKAN API
async function fetchESOEmbeddedWind(settlementDate: string, settlementPeriod: number): Promise<StrictResult> {
  const url = `https://api.neso.energy/api/3/action/datastore_search?resource_id=177f6fa4-ae49-4182-81ea-0c6b35f26ca6&filters={"SETTLEMENT_DATE":"${settlementDate}","SETTLEMENT_PERIOD":${settlementPeriod}}&limit=1`;
  return await tryOnce(url, "eso-embedded-wind");
}

// Fetch PV Live embedded solar
async function fetchPVLiveSolar(): Promise<StrictResult> {
  const url = "https://api.pvlive.uk/pvlive/api/v4/gsp/0?limit=4&format=json";
  return await tryOnce(url, "pvlive-solar");
}

// Fetch interconnectors with dual host support
async function fetchInterconnectors() {
  const hosts = [DATA_HOST, BMRS_HOST];
  
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
  const hosts = [DATA_HOST, BMRS_HOST];
  
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

// Settlement period helpers
function parseSettlementPeriod(r: any) {
  return Number(r.SETTLEMENT_PERIOD || r.settlementPeriod || r.SettlementPeriod || 0);
}

function parseSettlementDate(r: any) {
  return String(r.SETTLEMENT_DATE || r.settlementDate || r.SettlementDate || "");
}

function pickLatestSP(rows: any[]) {
  const getDate = (r: any) => parseSettlementDate(r);
  const getSP = (r: any) => parseSettlementPeriod(r);

  // Normalise to comparable numeric key: YYYYMMDD * 100 + SP
  const key = (r: any) => {
    const d = String(getDate(r)).replace(/[-/]/g, "");         // "2025-08-30" → "20250830"
    const sp = Number(getSP(r));
    if (!d || !Number.isFinite(sp)) return -1;
    return Number(d) * 100 + sp;
  };

  // Find max key
  let maxKey = -1;
  for (const r of rows) { maxKey = Math.max(maxKey, key(r)); }
  return rows.filter(r => key(r) === maxKey);
}

// Fuel type exclusions (interconnectors and pumped storage)
const EXCLUDE = /INTERCONNECT|^INT|PUMP|^PS$/i;

// Color mapping for generation types
const COLORS: Record<string, string> = { 
  Wind: "#10b981", 
  "LV Wind": "#059669", 
  Nuclear: "#f59e0b", 
  Gas: "#ef4444", 
  Coal: "#374151", 
  Hydro: "#3b82f6", 
  Solar: "#fbbf24", 
  Biomass: "#16a34a", 
  Oil: "#1f2937", 
  Other: "#6b7280" 
};

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

// Parse BMRS HV generation by fuel
function parseBMRSHVGeneration(rows: any[]) {
  const latest = pickLatestSP(rows);
  const hvByFuelMW: Record<string, number> = {};
  let anchorSP = 0;
  let anchorDate = "";

  for (const r of latest) {
    const fuelRaw = r.fuelType ?? r.fuel ?? r.FUEL_TYPE ?? r.name ?? "";
    if (EXCLUDE.test(fuelRaw)) continue;

    const mw = Number(r.generation ?? r.generationMW ?? r.GENERATION_MW ?? r.value ?? r.actual);
    if (!Number.isFinite(mw) || mw <= 0) continue;

    const fuelLabel = labelFuel(fuelRaw);
    hvByFuelMW[fuelLabel] = (hvByFuelMW[fuelLabel] || 0) + mw;

    // Capture anchor settlement period from first valid record
    if (!anchorSP) {
      anchorSP = parseSettlementPeriod(r);
      anchorDate = parseSettlementDate(r);
    }
  }

  return { hvByFuelMW, anchorSP, anchorDate };
}

// Convert datetime to settlement period (simplified for PV Live alignment)
function datetimeToSP(datetimeUTC: string): { date: string, period: number } {
  const dt = new Date(datetimeUTC);
  const dateStr = dt.toISOString().split('T')[0];
  const hour = dt.getUTCHours();
  const minute = dt.getUTCMinutes();
  const period = Math.floor((hour * 60 + minute) / 30) + 1;
  return { date: dateStr, period };
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

  // Helper to get last known interconnectors from LKG
  async function getLastInterconnectorsFromLKG() {
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
      if (lkgRow?.payload?.interconnectors && Array.isArray(lkgRow.payload.interconnectors) && lkgRow.payload.interconnectors.length > 0) {
        return lkgRow.payload.interconnectors;
      }
    } catch {}
    return [];
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

  try {
    // Fetch all data sources in parallel
    const [bmrsR, icR, demandR] = await Promise.all([
      fetchBMRSGeneration(),
      fetchInterconnectors(),
      fetchDemand(),
    ]);

    if (DEBUG) dlog(true, "Data fetch results:", { 
      bmrs: { ok: bmrsR.ok, variant: bmrsR.variant, status: (bmrsR as any).status }, 
      ic: { ok: icR.ok }, 
      demand: { ok: demandR.ok } 
    });

    // If BMRS fails, serve LKG or stub
    if (!bmrsR.ok) {
      if (DEBUG) dlog(true, "BMRS failed, trying LKG...");
      const lkgResponse = await serveLKG("BMRS unavailable; served LKG");
      if (lkgResponse) return lkgResponse;
      
      // Final stub if no LKG
      const stub = { 
        generationMix: [], 
        interconnectors: [], 
        totalGenerationMW: 0, 
        totalDemandMW: 0, 
        lastUpdated: new Date().toISOString(), 
        dataFreshness: { source: "BMRS", isRealtime: false, note: "BMRS unavailable", variant: "stub" } 
      };
      if (DEBUG) stub.diagnostics = { reason: "bmrs-failed", variant: "stub" };
      return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    // Parse BMRS HV generation
    const bmrsRows = asArray(bmrsR.data);
    const { hvByFuelMW, anchorSP, anchorDate } = parseBMRSHVGeneration(bmrsRows);
    
    if (DEBUG) dlog(true, "BMRS HV parsed:", { fuels: Object.keys(hvByFuelMW).length, anchorSP, anchorDate, sample: Object.entries(hvByFuelMW).slice(0, 3) });

    // Fetch embedded wind and solar aligned to anchor SP
    const [esoR, pvR] = await Promise.all([
      fetchESOEmbeddedWind(anchorDate, anchorSP),
      fetchPVLiveSolar(),
    ]);

    let embeddedWindMW = 0;
    let embeddedSolarMW = 0;
    let debugSamples: any = {};

    // Parse ESO embedded wind
    if (esoR.ok) {
      const esoRows = asArray(esoR.data);
      const esoRow = esoRows.find((r: any) => 
        parseSettlementDate(r) === anchorDate && parseSettlementPeriod(r) === anchorSP
      ) || esoRows[0];
      
      if (esoRow) {
        embeddedWindMW = Number(esoRow.EMBEDDED_WIND_GENERATION || esoRow.embedded_wind_generation || 0);
        if (DEBUG) debugSamples.esoWind = { 
          SETTLEMENT_DATE: esoRow.SETTLEMENT_DATE, 
          SETTLEMENT_PERIOD: esoRow.SETTLEMENT_PERIOD, 
          EMBEDDED_WIND_GENERATION: embeddedWindMW 
        };
      }
    }

    // Parse PV Live solar - align to anchor SP end time
    if (pvR.ok) {
      const pvRows = asArray(pvR.data);
      // Calculate target datetime for anchor SP (end of period)
      const anchorDateTime = new Date(`${anchorDate}T00:00:00Z`);
      anchorDateTime.setUTCMinutes((anchorSP - 1) * 30 + 30); // End of settlement period
      const targetDatetime = anchorDateTime.toISOString();
      
      const pvRow = pvRows.find((r: any) => r.datetime_utc === targetDatetime) || pvRows[0];
      if (pvRow) {
        embeddedSolarMW = Number(pvRow.generation_mw || 0);
        if (DEBUG) debugSamples.pvSolar = { 
          datetime_utc: pvRow.datetime_utc, 
          generation_mw: embeddedSolarMW 
        };
      }
    }

    if (DEBUG) dlog(true, "Embedded generation:", { embeddedWindMW, embeddedSolarMW, esoOk: esoR.ok, pvOk: pvR.ok });

    // Calculate total generation
    const hvTotalMW = Object.values(hvByFuelMW).reduce((sum, mw) => sum + mw, 0);
    const totalGenerationMW = hvTotalMW + embeddedWindMW + embeddedSolarMW;

    // Build generation mix
    const generationMix = [];
    
    // Add BMRS HV fuels
    for (const [fuel, mw] of Object.entries(hvByFuelMW)) {
      if (mw > 0) {
        generationMix.push({
          name: fuel,
          value: Math.round(mw),
          percentage: totalGenerationMW ? Math.round((mw / totalGenerationMW) * 100) : 0,
          color: COLORS[fuel] || "#6b7280",
        });
      }
    }

    // Add embedded wind if present
    if (embeddedWindMW > 0) {
      generationMix.push({
        name: "LV Wind",
        value: Math.round(embeddedWindMW),
        percentage: totalGenerationMW ? Math.round((embeddedWindMW / totalGenerationMW) * 100) : 0,
        color: COLORS["LV Wind"] || "#059669",
      });
    }

    // Add embedded solar if present
    if (embeddedSolarMW > 0) {
      generationMix.push({
        name: "Solar",
        value: Math.round(embeddedSolarMW),
        percentage: totalGenerationMW ? Math.round((embeddedSolarMW / totalGenerationMW) * 100) : 0,
        color: COLORS["Solar"] || "#fbbf24",
      });
    }

    // Sort by value descending
    generationMix.sort((a, b) => b.value - a.value);

    // Validate percentage sum
    const percentageSum = generationMix.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(percentageSum - 100) > 1.0) {
      dlog(true, `Warning: Percentage sum deviation: ${percentageSum}% (expected 100%)`);
    }

    // Interconnectors & Demand (best-effort)
    let interconnectors = [];
    let icSource = "live";
    if (icR.ok) {
      interconnectors = parseInterconnectors(icR.data);
      icSource = "live";
    } else {
      // Fallback to last known interconnectors
      interconnectors = await getLastInterconnectorsFromLKG();
      icSource = interconnectors.length > 0 ? "lkg" : "none";
    }
    
    const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

    const payload: any = {
      generationMix,
      interconnectors,
      totalGenerationMW: Math.round(totalGenerationMW),
      totalDemandMW: Math.round(totalDemand * 1000), // Convert GW to MW
      units: "MW",
      lastUpdated: new Date().toISOString(),
      dataFreshness: { 
        source: "BMRS HV + ESO + PV Live", 
        isRealtime: true, 
        variant: bmrsR.variant,
        interconnectorStatus: icSource === "live" ? "live" : icSource === "lkg" ? "cached" : "unavailable"
      },
      asOf: {
        settlementDate: anchorDate,
        settlementPeriod: anchorSP,
        percentageSum
      }
    };

    if (DEBUG) {
      payload.diagnostics = { 
        variant: bmrsR.variant,
        hvFuels: Object.keys(hvByFuelMW).length,
        hvTotalMW,
        embeddedWindMW,
        embeddedSolarMW,
        totalGenerationMW,
        percentageSum,
        bmrsSample: pickLatestSP(bmrsRows).slice(0, 2),
        ...debugSamples,
        icOk: icR.ok,
        icHost: (icR as any).host,
        icCount: interconnectors.length,
        icSource
      };
    }

    await insertLKG(payload.lastUpdated, payload, totalGenerationMW);

    return new Response(JSON.stringify(payload), { 
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } 
    });

  } catch (error) {
    console.error('Error in energy-data function:', error);
    
    // Try LKG before returning error
    const lkgResponse = await serveLKG("Unexpected error; served LKG");
    if (lkgResponse) return lkgResponse;
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      generationMix: [], 
      interconnectors: [], 
      totalGenerationMW: 0, 
      totalDemandMW: 0,
      dataFreshness: { source: "BMRS", isRealtime: false, note: "Error occurred" }
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});