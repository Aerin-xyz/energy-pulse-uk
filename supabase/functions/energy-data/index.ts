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

// Embedded wind (ESO CKAN) with tolerant filters
async function fetchEmbeddedWindESO(anchorDate: string, anchorSP: number): Promise<{ mw: number; matched: boolean; reason: string; row?: any; }> {
  const filters = encodeURIComponent(JSON.stringify({
    SETTLEMENT_DATE: anchorDate,
    SETTLEMENT_PERIOD: anchorSP
  }));
  const urlExact = `https://api.neso.energy/api/3/action/datastore_search?resource_id=177f6fa4-ae49-4182-81ea-0c6b35f26ca6&filters=${filters}&limit=1`;
  const urlLatest = `https://api.neso.energy/api/3/action/datastore_search?resource_id=177f6fa4-ae49-4182-81ea-0c6b35f26ca6&limit=1&sort=_id desc`;

  async function fetchFirst(url: string) {
    try {
      const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.toLowerCase().includes("json")) return null;
      const json = await res.json();
      const rows = (json?.result?.records && Array.isArray(json.result.records)) ? json.result.records : (Array.isArray(json?.data) ? json.data : []);
      return rows && rows.length ? rows[0] : null;
    } catch { return null; }
  }

  const row = await fetchFirst(urlExact) || await fetchFirst(urlLatest);
  if (!row) return { mw: 0, matched: false, reason: "no-ckan-row" };

  const mwRaw = row.EMBEDDED_WIND_GENERATION ?? row.embedded_wind_generation ?? row.EMBEDDED_WIND_MW ?? row.value;
  const mw = Number(mwRaw);
  if (!Number.isFinite(mw) || mw < 0) return { mw: 0, matched: false, reason: "no-mw" };

  const rDate = String(row.SETTLEMENT_DATE ?? row.settlement_date ?? "").slice(0,10);
  const rSP = Number(row.SETTLEMENT_PERIOD ?? row.settlement_period);
  const aligned = (rDate === anchorDate && Number.isFinite(rSP) && Math.abs(rSP - anchorSP) <= 1);

  return { mw, matched: aligned, reason: aligned ? "aligned" : "tolerated", row };
}

// PV Live embedded solar — choose nearest prior half-hour within 45 minutes
async function fetchEmbeddedSolarPVLive(anchorEndISO: string): Promise<{ mw: number; matched: boolean; reason: string; row?: any; }>
{
  try {
    const anchor = new Date(anchorEndISO);
    const start = new Date(anchor.getTime() - 3 * 60 * 60 * 1000);

    const urlWindowed = `https://api.pvlive.uk/pvlive/api/v4/gsp/0?period=30&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(anchor.toISOString())}&data_format=json`;
    const urlFallback = `https://api.pvlive.uk/pvlive/api/v4/gsp/0?period=30&updated_gmt_to=${encodeURIComponent(anchor.toISOString())}&data_format=json`;

    async function fetchPV(url: string, tag: string) {
      try {
        const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        const text = await res.text();
        if (!ct.toLowerCase().includes("json")) {
          return { ok: false, reason: "pv-non-json", ct, sample: text.slice(0, 400), url, tag };
        }
        let json: any;
        try {
          json = JSON.parse(text);
        } catch {
          return { ok: false, reason: "pv-json-parse-failed", sample: text.slice(0, 400), url, tag, ct };
        }
        const raw = Array.isArray(json?.data) ? json.data : [];
        const rows = raw.map((r: any) => Array.isArray(r) ? { t: r[0], mw: r[1] } : { t: r.datetime_utc, mw: r.generation_mw });
        return { ok: true, rows, url, tag, ct };
      } catch {
        return { ok: false, reason: "pv-fetch-error", url, tag };
      }
    }

    let r: any = await fetchPV(urlWindowed, "windowed");
    if (!(r.ok && r.rows && r.rows.length)) {
      const r2: any = await fetchPV(urlFallback, "updated_gmt_to");
      if (r2.ok && r2.rows && r2.rows.length) r = r2;
      else {
        const err: any = r.ok ? r2 : r;
        if (err.reason === "pv-non-json") {
          return { mw: 0, matched: false, reason: "pv-non-json", row: { note: "non-json", content_type: err.ct, sample: err.sample, url: err.url, source: err.tag } } as any;
        }
        if (err.reason === "pv-json-parse-failed") {
          return { mw: 0, matched: false, reason: "pv-json-parse-failed", row: { sample: err.sample, url: err.url, source: err.tag } } as any;
        }
        return { mw: 0, matched: false, reason: (err.reason || "pv-no-data"), row: { url: err.url, source: err.tag } } as any;
      }
    }

    const rows: any[] = r.rows as any[];
    const anchorMs = anchor.getTime();

    let best: any = null, bestDt = -Infinity;
    for (const row of rows) {
      const dt = new Date(row.t).getTime();
      if (Number.isFinite(dt) && dt <= anchorMs && dt > bestDt) { best = row; bestDt = dt; }
    }
    if (!best) {
      return { mw: 0, matched: false, reason: "pv-no-prior-row", row: { url: r.url, source: r.tag } };
    }

    const mw = Number(best.mw);
    if (!Number.isFinite(mw) || mw < 0) {
      return { mw: 0, matched: false, reason: "pv-no-mw", row: { url: r.url, source: r.tag } };
    }

    const within45m = (anchorMs - bestDt) <= 45 * 60 * 1000;
    return { mw, matched: within45m, reason: within45m ? "aligned" : "tolerated", row: { datetime_utc: new Date(bestDt).toISOString(), generation_mw: mw, source: r.tag, url: r.url } };
  } catch {
    return { mw: 0, matched: false, reason: "pv-error" };
  }
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

// Dataset fallback: FUELHH stream
async function fetchFUELHHStream(limit = 200): Promise<StrictResult> {
  const hosts = [DATA_HOST, BMRS_HOST];
  for (const host of hosts) {
    const url = `https://${host}/bmrs/api/v1/datasets/FUELHH/stream?limit=${limit}&format=json`;
    const r = await tryOnce(url, `dataset-fuelhh-stream@${host === DATA_HOST ? 'data' : 'bmrs'}`);
    if (r.ok) return r;
  }
  return { ok: false, url: '', status: 502, reason: 'fuelhh-all-hosts-failed', variant: 'exhausted' } as any;
}

function parseFUELHHtoMW(rows: any[]) {
  const latest = pickLatestSP(rows);
  const hvByFuelMW: Record<string, number> = {};
  let anchorSP = 0;
  let anchorDate = "";
  for (const r of latest) {
    const fuelRaw = r.FUEL_TYPE ?? r.FUELTYPE ?? r.fuel ?? r.fuelType ?? r.name ?? "";
    if (EXCLUDE.test(fuelRaw)) continue;

    let mw: number;
    const generation = Number(r.generation);
    if (Number.isFinite(generation)) {
      mw = generation;
    } else {
      const mwh = Number(r.MWH ?? r.ENERGY_MWH);
      if (!Number.isFinite(mwh)) continue;
      mw = mwh * 2; // 30-min energy → MW
    }
    if (!(mw > 0)) continue;

    const fuelLabel = labelFuel(fuelRaw);
    hvByFuelMW[fuelLabel] = (hvByFuelMW[fuelLabel] || 0) + mw;

    if (!anchorSP) {
      anchorSP = parseSettlementPeriod(r);
      anchorDate = parseSettlementDate(r);
    }
  }
  return { hvByFuelMW, anchorSP, anchorDate };
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

    // Resolve BMRS HV baseline → dataset fallback → LKG
    let hvByFuelMW: Record<string, number> = {};
    let anchorSP = 0;
    let anchorDate = "";
    let variant = bmrsR.variant;

    if (!bmrsR.ok) {
      if (DEBUG) dlog(true, "BMRS failed, trying dataset fallback...");
      const ds = await fetchFUELHHStream(200);
      if (ds.ok) {
        const rows = asArray(ds.data);
        const parsed = parseFUELHHtoMW(rows);
        hvByFuelMW = parsed.hvByFuelMW; anchorSP = parsed.anchorSP; anchorDate = parsed.anchorDate; variant = "dataset-fuelhh-stream";
      } else {
        const lkgResponse = await serveLKG("BMRS unavailable; served LKG");
        if (lkgResponse) return lkgResponse;
        const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "BMRS unavailable", variant: "stub" } };
        if (DEBUG) (stub as any).diagnostics = { reason: "bmrs-failed", variant: "stub" };
        return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
    } else {
      // Parse BMRS HV generation
      const bmrsRows = asArray(bmrsR.data);
      const parsed = parseBMRSHVGeneration(bmrsRows);
      hvByFuelMW = parsed.hvByFuelMW; anchorSP = parsed.anchorSP; anchorDate = parsed.anchorDate;
      if (DEBUG) dlog(true, "BMRS HV parsed:", { fuels: Object.keys(hvByFuelMW).length, anchorSP, anchorDate, sample: Object.entries(hvByFuelMW).slice(0, 3) });

      // Sanity band on HV baseline; if out of range, try dataset fallback
      const hvTotalNow = Object.values(hvByFuelMW).reduce((s, v) => s + v, 0);
      if (!(hvTotalNow >= 10000 && hvTotalNow <= 80000)) {
        if (DEBUG) dlog(true, "HV baseline out of band, trying dataset fallback", { hvTotalNow });
        const ds = await fetchFUELHHStream(200);
        if (ds.ok) {
          const rows = asArray(ds.data);
          const p2 = parseFUELHHtoMW(rows);
          const hvTotal2 = Object.values(p2.hvByFuelMW).reduce((s, v) => s + v, 0);
          if (hvTotal2 >= 10000 && hvTotal2 <= 80000) {
            hvByFuelMW = p2.hvByFuelMW; anchorSP = p2.anchorSP; anchorDate = p2.anchorDate; variant = "dataset-fuelhh-stream";
          } else {
            if (DEBUG) dlog(true, "Dataset fallback also implausible", { hvTotal2 });
            const lkgResponse = await serveLKG("HV baseline implausible; served LKG");
            if (lkgResponse) return lkgResponse;
            const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: HV implausible" } };
            return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
          }
        } else {
          const lkgResponse = await serveLKG("HV baseline implausible; served LKG");
          if (lkgResponse) return lkgResponse;
          const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "Stub: HV implausible" } };
          return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
        }
      }
    }

    // Compute anchor end ISO for the settlement period
    const anchorDateTime = new Date(`${anchorDate}T00:00:00Z`);
    anchorDateTime.setUTCMinutes((anchorSP - 1) * 30 + 30);
    const anchorEndISO = anchorDateTime.toISOString();

    // Optional embedded feeds with tolerance
    const [windEmb, solarEmb] = await Promise.all([
      fetchEmbeddedWindESO(anchorDate, anchorSP),
      fetchEmbeddedSolarPVLive(anchorEndISO),
    ]);

    const embeddedWindMW = windEmb.matched ? windEmb.mw : 0;
    const embeddedSolarMW = solarEmb.matched ? solarEmb.mw : 0;

    // Totals (MW discipline)
    const hvTotalMW = Object.values(hvByFuelMW).reduce((sum, mw) => sum + mw, 0);
    const totalGenerationMW = hvTotalMW + embeddedWindMW + embeddedSolarMW;

    // Build generation mix
    const generationMix: any[] = [];
    for (const [fuel, mw] of Object.entries(hvByFuelMW)) {
      if (mw > 0) {
        generationMix.push({ name: fuel, value: Math.round(mw), percentage: 0, color: COLORS[fuel] || "#6b7280" });
      }
    }
    if (embeddedWindMW > 0) generationMix.push({ name: "LV Wind", value: Math.round(embeddedWindMW), percentage: 0, color: COLORS["LV Wind"] || "#059669" });
    generationMix.push({ name: "Solar", value: Math.round(embeddedSolarMW), percentage: 0, color: COLORS["Solar"] || "#fbbf24" });

    // Compute percentages now that total is final
    for (const item of generationMix) {
      item.percentage = totalGenerationMW ? Math.round((item.value / totalGenerationMW) * 100) : 0;
    }
    generationMix.sort((a, b) => b.value - a.value);

    const percentageSum = generationMix.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(percentageSum - 100) > 1.0) {
      dlog(true, `Warning: Percentage sum deviation: ${percentageSum}% (expected 100%)`);
    }

    // Interconnectors & Demand (best-effort)
    let interconnectors = [] as any[];
    let icSource = "live";
    if (icR.ok) {
      interconnectors = parseInterconnectors(icR.data);
      icSource = "live";
    } else {
      interconnectors = await getLastInterconnectorsFromLKG();
      icSource = interconnectors.length > 0 ? "lkg" : "none";
    }
    const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

    const fullLive = variant.startsWith("outturn-") && windEmb.matched && solarEmb.matched;

    const payload: any = {
      generationMix,
      interconnectors,
      totalGenerationMW: Math.round(totalGenerationMW),
      totalDemandMW: Math.round(totalDemand * 1000),
      units: "MW",
      lastUpdated: new Date().toISOString(),
      dataFreshness: {
        source: "BMRS HV + ESO + PV Live",
        isRealtime: true,
        variant,
        interconnectorStatus: icSource === "live" ? "live" : icSource === "lkg" ? "cached" : "unavailable",
        status: fullLive ? "live" : "live-partial",
      },
      asOf: {
        settlementDate: anchorDate,
        settlementPeriod: anchorSP,
        endISO: anchorEndISO,
        percentageSum,
      }
    };

    if (DEBUG) {
      payload.diagnostics = {
        variant,
        hvFuels: Object.keys(hvByFuelMW).length,
        hvTotalMW,
        totalGenerationMW,
        anchor: { date: anchorDate, sp: anchorSP, endISO: anchorEndISO },
        wind: { matched: windEmb.matched, reason: windEmb.reason, mw: windEmb.mw },
        solar: { matched: solarEmb.matched, reason: solarEmb.reason, mw: solarEmb.mw, row: (solarEmb as any).row, raw: (solarEmb as any).raw, contentType: (solarEmb as any).contentType },
        icOk: icR.ok,
        icCount: interconnectors.length,
        icSource,
      };
    }

    await insertLKG(payload.lastUpdated, payload, totalGenerationMW);

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

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