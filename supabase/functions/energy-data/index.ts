import { XMLParser } from "https://esm.sh/fast-xml-parser@4.5.0";

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

// PV Live embedded solar — column-aware parser with 45m tolerance
async function fetchEmbeddedSolarPVLive(anchorEndISO: string, debug = false): Promise<{ mw: number; matched: boolean; reason: string; debug?: { picked?: any; columns?: any } }>
{
  const candidates = [
    { url: 'https://api.pvlive.uk/pvlive/api/v4/gsp/0?data_format=json', tag: 'pvlive-uk-v4' },
    { url: 'https://api0.solar.shef.ac.uk/pvlive/v3/gsp/0', tag: 'sheffield-api0-v3' },
    { url: 'https://api1.solar.shef.ac.uk/pvlive/v3/gsp/0', tag: 'sheffield-api1-v3' },
    { url: 'https://api2.solar.shef.ac.uk/pvlive/v3/gsp/0', tag: 'sheffield-api2-v3' },
  ];

  let sawJson = false;
  let lastCols: any = null;

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { headers: HEADERS, cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (debug) dlog(true, 'PV Live attempt', { tag: c.tag, status: res.status, contentType: ct, preview: text.slice(0, 180) });
      if (!ct.toLowerCase().includes('json') || !res.ok) continue;
      sawJson = true;
      const resp: any = JSON.parse(text);

      // Normalise into { t, mw }
      let rows: Array<{ t: string; mw: number }> = [];
      const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
      // v4 uses `meta` for column names; v3 sometimes uses `columns`
      const cols = Array.isArray(resp?.columns) ? resp.columns : (Array.isArray(resp?.meta) ? resp.meta : null);
      lastCols = cols;

      if (cols && data.length && Array.isArray(data[0])) {
        const idxDtUtc = cols.indexOf('datetime_utc');
        const idxDtGmt = cols.indexOf('datetime_gmt');
        const dtIdx = idxDtUtc >= 0 ? idxDtUtc : (idxDtGmt >= 0 ? idxDtGmt : -1);
        const mwIdx = cols.indexOf('generation_mw');
        if (dtIdx === -1 || mwIdx === -1) {
          if (debug) dlog(true, 'PV Live missing columns', { tag: c.tag, columns: cols });
          continue;
        }
        rows = data
          .map((arr: any[]) => ({ t: arr[dtIdx], mw: num(arr[mwIdx]) }))
          .filter(r => Number.isFinite(r.mw) && typeof r.t === 'string');
      } else {
        rows = data
          .map((r: any) => ({
            t: r?.datetime_utc ?? r?.datetime_gmt ?? r?.t,
            mw: num(r?.generation_mw ?? r?.mw ?? r?.value),
          }))
          .filter(r => Number.isFinite(r.mw) && typeof r.t === 'string');
      }

      if (!rows.length) {
        if (debug) dlog(true, 'PV Live no finite rows', { tag: c.tag, columns: cols });
        continue;
      }

      // Pick the latest point at or before the period end, with ≤45 min tolerance (clamped to now)
      const periodEnd = new Date(anchorEndISO).getTime();
      const effectiveAnchor = Math.min(periodEnd, Date.now());
      let best: { t: string; mw: number } | null = null;
      let bestTs = -Infinity;
      for (const r of rows) {
        const ts = new Date(r.t).getTime();
        if (Number.isFinite(ts) && ts <= periodEnd && ts > bestTs) {
          best = r; bestTs = ts;
        }
      }

      if (!best) {
        if (debug) dlog(true, 'PV Live no prior match', { tag: c.tag });
        continue;
      }

      const within45m = (effectiveAnchor - bestTs) <= 45 * 60 * 1000;
      const out = { mw: best.mw, matched: within45m, reason: within45m ? 'aligned' : 'tolerated', debug: { picked: best, columns: lastCols } };
      if (debug) dlog(true, 'PV Live parsed', { tag: c.tag, rows: rows.length, picked: out.debug?.picked, columns: lastCols });
      return out;
    } catch (e) {
      if (debug) dlog(true, 'PV Live error', { tag: c.tag, error: (e as Error)?.message });
      continue;
    }
  }

  // If all attempts failed
  return { mw: 0, matched: false, reason: sawJson ? 'pv-unexpected-shape' : 'pv-no-json', debug: { columns: lastCols } };
}

// Enhanced EU Generation Mix from ENTSO-E A74 (Actual Generation Per Type)
async function fetchEUGenerationMix(debug = false, euFocus = false): Promise<any[]> {
  const dlog = (important: boolean, ...args: any[]) => debug && console.log('[energy-data]', ...args);
  const token = Deno.env.get("ENTSOE_API_TOKEN");
  
  if (debug || euFocus) dlog(true, 'EU mix: Starting fetch', { hasToken: !!token });
  
  if (!token) {
    if (debug || euFocus) dlog(true, 'EU mix: No ENTSO-E API token configured');
    return [];
  }
  
  // Start with just France to test
  const countries = [
    { code: 'FR', eic: '10YFR-RTE------C', name: 'France' }
  ];
  
  // Use a 24-hour window ending 2 hours ago for more reliable data
  const now = new Date();
  const endTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
  
  // ENTSO-E expects YYYYMMDDHHMM format in UTC
  const formatDateTime = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
  };
  
  const startDate = formatDateTime(startTime);
  const endDate = formatDateTime(endTime);
  
  if (debug || euFocus) dlog(true, 'EU mix: Date range', { 
    startDate, 
    endDate,
    startUTC: startTime.toISOString(),
    endUTC: endTime.toISOString()
  });
  
  const results: any[] = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    parseTrueNumberOnly: true
  });

  // Process countries sequentially
  for (const country of countries) {
    try {
      // Use A74 (Actual Generation Per Type) instead of A75
      const url = `https://web-api.tp.entsoe.eu/api?securityToken=${token}&documentType=A74&processType=A16&outBiddingZone_Domain=${country.eic}&periodStart=${startDate}&periodEnd=${endDate}`;
      
      if (debug || euFocus) dlog(true, `Fetching ${country.name} (${country.code}) with URL: ${url.replace(token, 'TOKEN_HIDDEN')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Accept': 'application/xml',
          'User-Agent': 'EnergyDashboard/1.0',
          'Content-Type': 'application/xml'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (debug || euFocus) {
          dlog(true, `${country.code}: HTTP ${response.status} - Error response:`);
          
          // Try to parse XML error for better understanding
          try {
            const errorParsed = parser.parse(errorText);
            const ackDoc = errorParsed.Acknowledgement_MarketDocument;
            if (ackDoc?.Reason?.text) {
              dlog(true, `${country.code}: Error reason: ${ackDoc.Reason.text}`);
              dlog(true, `${country.code}: Error code: ${ackDoc.Reason.code}`);
            } else {
              dlog(true, `${country.code}: Raw error: ${errorText.substring(0, 500)}`);
            }
          } catch (parseError) {
            dlog(true, `${country.code}: Raw error text: ${errorText.substring(0, 500)}`);
          }
        }
        continue;
      }
      
      const xmlText = await response.text();
      if (debug || euFocus) dlog(true, `${country.code}: Received XML response (${xmlText.length} chars)`);
      
      const parsed = parser.parse(xmlText);
      const doc = parsed.GL_MarketDocument || parsed.Publication_MarketDocument;
      
      if (!doc) {
        if (debug || euFocus) dlog(true, `${country.code}: No valid document structure in response`);
        continue;
      }
      
      if (!doc.TimeSeries) {
        if (debug || euFocus) dlog(true, `${country.code}: No TimeSeries in response, available keys:`, Object.keys(doc));
        continue;
      }
      
      // Extract generation data by fuel type
      const timeSeries = Array.isArray(doc.TimeSeries) ? doc.TimeSeries : [doc.TimeSeries];
      const mixByFuel: Record<string, number> = {};
      let latestTime: string | undefined;
      
      if (debug || euFocus) dlog(true, `${country.code}: Found ${timeSeries.length} time series`);
      
      for (const series of timeSeries) {
        try {
          const psrType = series.MktPSRType?.psrType || 'Other';
          const periods = Array.isArray(series.Period) ? series.Period : [series.Period];
          
          if (!periods || periods.length === 0) {
            if (debug || euFocus) dlog(true, `${country.code}: No periods found for ${psrType}`);
            continue;
          }
          
          // Get the most recent period with data
          const validPeriods = periods.filter((p: any) => p?.Point && p?.timeInterval?.start);
          if (validPeriods.length === 0) {
            if (debug || euFocus) dlog(true, `${country.code}: No valid periods for ${psrType}`);
            continue;
          }
          
          const latestPeriod = validPeriods.sort((a: any, b: any) => 
            new Date(b.timeInterval.start).getTime() - new Date(a.timeInterval.start).getTime()
          )[0];
          
          if (!latestPeriod) continue;
          
          latestTime = latestPeriod.timeInterval.start;
          const points = Array.isArray(latestPeriod.Point) ? latestPeriod.Point : [latestPeriod.Point];
          
          // Sum all points for this fuel type
          const totalMW = points
            .filter((p: any) => p?.quantity !== undefined && !isNaN(Number(p.quantity)))
            .reduce((sum: number, p: any) => sum + Number(p.quantity), 0);
          
          if (totalMW > 0) {
            mixByFuel[psrType] = (mixByFuel[psrType] || 0) + totalMW;
            if (debug || euFocus) dlog(true, `${country.code}: ${psrType} = ${totalMW.toFixed(1)} MW`);
          }
        } catch (seriesError) {
          if (debug || euFocus) dlog(true, `${country.code}: Error processing series - ${seriesError.message}`);
        }
      }
      
      if (Object.keys(mixByFuel).length > 0) {
        const totalMW = Object.values(mixByFuel).reduce((sum, mw) => sum + mw, 0);
        
        results.push({
          code: country.code,
          ts: latestTime || new Date().toISOString(),
          mixByFuel,
          ok: true
        });
        
        if (debug || euFocus) {
          dlog(true, `${country.code}: SUCCESS - ${Object.keys(mixByFuel).length} fuel types, ${Math.round(totalMW)} MW total`);
        }
      } else {
        if (debug || euFocus) dlog(true, `${country.code}: No valid generation data found`);
      }
      
      // Be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      if (debug || euFocus) dlog(true, `${country.code}: Error - ${error.message}`);
    }
  }
  
  if (debug || euFocus) dlog(true, `EU mix: Complete - ${results.length} countries successful`);
  return results;
}

/**
 * Fetches ENTSO-E physical flows using the new enhanced method.
 * Uses standardized ENTSOE_BORDERS configuration with proper interconnector mapping.
 */
async function fetchEntsoePhysicalFlows(): Promise<{
  flows?: Record<string, number>;
  interconnectors?: any[];
  ok: boolean;
  reason?: string;
  attempts?: any[];
}> {
  const apiToken = Deno.env.get('ENTSOE_API_TOKEN');
  if (!apiToken) {
    return { ok: false, reason: 'no-api-token' };
  }

  const now = new Date();
  const attempts: any[] = [];
  const interconnectors: any[] = [];

  try {
    // Query each border using the new improved method
    for (const border of ENTSOE_BORDERS) {
      try {
        const result = await entsoeNetForBorderMW(apiToken, border.eic, border.mtuMin, now);
        
        attempts.push({
          border: border.name,
          eic: border.eic,
          ok: result.ok,
          netMW: result.netMW,
          reason: result.reason || undefined,
          timestamp: result.t || undefined
        });

        if (result.ok && Number.isFinite(result.netMW)) {
          // Get capacity from hints
          const capacity = CAPACITY_HINTS[border.name] || null;
          
          interconnectors.push({
            name: border.displayName,
            country: border.country,
            flow: result.netMW,
            capacity: capacity
          });
        }

      } catch (e) {
        attempts.push({
          border: border.name,
          eic: border.eic,
          ok: false,
          reason: (e as Error)?.message || 'unknown-error'
        });
      }
    }

    // Success if we got any valid interconnector data
    if (interconnectors.length > 0) {
      return { 
        ok: true, 
        interconnectors,
        attempts,
        flows: undefined // Legacy compatibility - not needed with new format
      };
    }

    return { 
      ok: false, 
      reason: 'no-valid-interconnectors',
      attempts 
    };

  } catch (e) {
    return { 
      ok: false, 
      reason: (e as Error).message,
      attempts 
    };
  }
}

/**
 * Fetches all possible interconnectors showing their current status.
 * Returns all ENTSOE_BORDERS regardless of whether they have live data.
 */
async function fetchAllInterconnectorsWithStatus(debug = false): Promise<{
  ok: boolean; 
  attempts: any[];
  status: string;
  interconnectors: any[];
}> {
  const attempts: any[] = [];
  const allInterconnectors: any[] = [];

  // Strategy 1: Try to get live ENTSO-E data for all borders
  const apiToken = Deno.env.get('ENTSOE_API_TOKEN');
  const hasEntsoeToken = Boolean(apiToken);
  
  if (hasEntsoeToken && debug) dlog(true, "Trying ENTSO-E physical flows for all interconnectors...");
  
  const now = new Date();
  
  // Process each possible interconnector
  for (const border of ENTSOE_BORDERS) {
    const capacity = CAPACITY_HINTS[border.name] || null;
    
    let flow = 0;
    let interconnectorStatus: "live" | "offline" | "unavailable" = "unavailable";
    
    if (hasEntsoeToken) {
      try {
        const result = await entsoeNetForBorderMW(apiToken, border.eic, border.mtuMin, now);
        
        attempts.push({
          border: border.name,
          eic: border.eic,
          ok: result.ok,
          netMW: result.netMW,
          reason: result.reason || undefined,
          timestamp: result.t || undefined
        });

        if (result.ok && Number.isFinite(result.netMW)) {
          flow = result.netMW;
          interconnectorStatus = "live";
        } else {
          interconnectorStatus = "offline";
        }
      } catch (e) {
        attempts.push({
          border: border.name,
          eic: border.eic,
          ok: false,
          reason: (e as Error)?.message || 'unknown-error'
        });
        interconnectorStatus = "unavailable";
      }
    }
    
    allInterconnectors.push({
      name: border.displayName,
      country: border.country,
      flow: flow,
      capacity: capacity,
      status: interconnectorStatus,
      borderName: border.name // For debugging
    });
  }

  const liveCount = allInterconnectors.filter(ic => ic.status === "live").length;
  const overallStatus = liveCount > 0 ? "live" : (hasEntsoeToken ? "cached" : "unavailable");
  
  if (debug) dlog(true, `All interconnectors processed: ${liveCount}/${allInterconnectors.length} live`);

  return {
    ok: true,
    attempts,
    status: overallStatus,
    interconnectors: allInterconnectors
  };
}

/**
 * Legacy function for backward compatibility
 */
async function fetchInterconnectorsEnhanced(debug = false): Promise<{
  ok: boolean; 
  data?: any; 
  attempts: any[];
  source?: string;
  status?: string;
  interconnectors?: any[];
}> {
  const result = await fetchAllInterconnectorsWithStatus(debug);
  
  return {
    ok: result.ok,
    data: result.interconnectors,
    attempts: result.attempts,
    source: "entso-e-enhanced",
    status: result.status,
    interconnectors: result.interconnectors
  };
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

// Helpers: robust array extraction (wrap singletons)
function asArray(x: any): any[] {
  if (x == null) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray((x as any).data)) return (x as any).data;
  if ((x as any).result?.records && Array.isArray((x as any).result.records)) return (x as any).result.records;
  if ((x as any).items && Array.isArray((x as any).items)) return (x as any).items;
  return [x];
}

// Safe number helper
const num = (x: any) => {
  const n = typeof x === 'string' ? Number(x) : (Number.isFinite(x) ? x : Number(x));
  return Number.isFinite(n) ? n : NaN;
};

// ---------- ENTSO-E A11 helpers ----------
const ENTSOE_BASE = "https://web-api.tp.entsoe.eu/api";
const GB_EIC = "10YGB----------A";

// Borders to report with standardized naming
const ENTSOE_BORDERS = [
  { name: "France",           eic: "10YFR-RTE------C",  mtuMin: 15, displayName: "France",          country: "France" },
  { name: "Belgium",          eic: "10YBE----------2",  mtuMin: 15, displayName: "Belgium",         country: "Belgium" },
  { name: "Netherlands",      eic: "10YNL----------L",  mtuMin: 15, displayName: "Netherlands",     country: "Netherlands" },
  { name: "Norway",           eic: "10YNO-2--------T",  mtuMin: 15, displayName: "Norway",          country: "Norway" },
  { name: "Ireland (SEM)",    eic: "10YIE-1001A00010", mtuMin: 30, displayName: "EWIC",            country: "Ireland" },
  { name: "Northern Ireland", eic: "10Y1001A1001A59C", mtuMin: 30, displayName: "Moyle",           country: "Northern Ireland" },
  { name: "Denmark DK1",      eic: "10YDK-1--------W",  mtuMin: 15, displayName: "Viking Link",    country: "Denmark" },
  { name: "Denmark DK2",      eic: "10YDK-2--------M",  mtuMin: 15, displayName: "Denmark West",   country: "Denmark" },
];

// Capacity hints using standardized border names
const CAPACITY_HINTS: Record<string, number> = {
  "France": 4000,              // IFA (2000) + IFA2 (1000) + ElecLink (1000)
  "Belgium": 1000,             // Nemo Link
  "Netherlands": 1000,         // BritNed
  "Norway": 1400,              // NSL
  "Ireland (SEM)": 500,        // EWIC
  "Northern Ireland": 500,     // Moyle
  "Denmark DK1": 1400,         // Viking Link
  "Denmark DK2": 700,          // Denmark West
};

function pad2(n:number){ return n.toString().padStart(2,"0"); }
function floorTo15m(d: Date) {
  const copy = new Date(d);
  copy.setUTCMinutes(Math.floor(copy.getUTCMinutes()/15)*15, 0, 0);
  return copy;
}
function toPeriod(d: Date) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth()+1)}${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`;
}

// MTU helpers
function alignDown(date: Date, stepMin: number) {
  const d = new Date(date);
  const m = d.getUTCMinutes();
  const alignedMin = Math.floor(m / stepMin) * stepMin;
  d.setUTCMinutes(alignedMin, 0, 0);
  return d;
}
function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60 * 1000);
}

// Extract acknowledgement reason (if any)
function ackReason(xml: string) {
  try {
    const dom = new DOMParser().parseFromString(xml, "application/xml");
    const txt = dom?.getElementsByTagName("Reason")[0]?.getElementsByTagName("text")[0]?.textContent;
    return txt || null;
  } catch { return null; }
}

// Minimal XML parse using fast-xml-parser
function parseEntsoeA11(xml: string) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      allowBooleanAttributes: true,
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });
    const doc: any = parser.parse(xml);
    if (!doc) return { ok:false, points:[], meta:{ reason:"no-doc" } };

    // Acknowledgement? Extract reason(s)
    if (doc.Acknowledgement_MarketDocument) {
      const ack = doc.Acknowledgement_MarketDocument;
      const reasons = asArray(ack.Reason || ack.reason || []);
      const reasonTexts = reasons
        .map((r: any) => r.text || r.reasonText || r.description || r.message || r.code)
        .filter(Boolean);
      const reasonCodes = reasons.map((r: any) => r.code).filter(Boolean);
      return { ok:false, points:[], meta:{ reason:"acknowledgement", reasonText: reasonTexts.join(" | ") || undefined, reasonCodes } };
    }

    const pmd = doc.Publication_MarketDocument;
    if (!pmd) return { ok:false, points:[], meta:{ reason:"no-pmd" } };

    const series = asArray(pmd.TimeSeries);
    const points: Array<{ t: string; quantity: number }> = [];

    for (const ts of series) {
      const periods = asArray(ts.Period);
      for (const period of periods) {
        const ti = period.timeInterval || {};
        const startISO = ti.start || "";
const resolutionRaw = String(period.resolution || "PT60M");
// Support PT15M, PT30M, PT60M / PT1H, etc.
const resMatch = resolutionRaw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
let stepMin = 60;
if (resMatch) {
  const h = Number(resMatch[1] || 0);
  const m = Number(resMatch[2] || 0);
  stepMin = h * 60 + (m || (h ? 60 : 0));
} else {
  stepMin = resolutionRaw.includes("15") ? 15 : (resolutionRaw.includes("30") ? 30 : 60);
}

        const rawPts = asArray(period.Point);
        for (const p of rawPts) {
          const pos = Number(p.position ?? p.pos ?? 0); // 1-based
          const qty = Number(p.quantity ?? p.q ?? NaN);
          if (!startISO || !Number.isFinite(qty) || !(pos > 0)) continue;
          const t0 = new Date(startISO).getTime();
          if (!Number.isFinite(t0)) continue;
          const t = new Date(t0 + (pos - 1) * stepMin * 60 * 1000).toISOString();
          points.push({ t, quantity: qty });
        }
      }
    }
    return { ok: points.length > 0, points, meta:{ count: points.length } };
  } catch (e) {
    return { ok:false, points:[], meta:{ reason:"xml-parse-error", error: (e as Error)?.message } };
  }
}

// Tiny in-memory cache to respect rate limits
const A11_TTL_MS = 1000 * 100; // ~100s
const a11Cache = new Map<string, { expiry: number; value: any }>();

async function entsoeA11(token: string, inDomain: string, outDomain: string, start: Date, end: Date) {
  const periodStart = toPeriod(floorTo15m(start));
  const periodEnd   = toPeriod(new Date(floorTo15m(end).getTime() + 15 * 60 * 1000));
  const url = `${ENTSOE_BASE}?securityToken=${encodeURIComponent(token)}&documentType=A11&in_Domain=${inDomain}&out_Domain=${outDomain}&periodStart=${periodStart}&periodEnd=${periodEnd}`;

  const now = Date.now();
  const cached = a11Cache.get(url);
  if (cached && cached.expiry > now) return cached.value;

  const res = await fetch(url, { headers: { "Accept": "application/xml" }, redirect: "manual" as RequestRedirect, cache: "no-store" });
  const text = await res.text();
  const isXML = (res.headers.get("content-type") || "").includes("xml");
  if (!isXML) {
    const value = { ok:false, points:[], meta:{ status:res.status, reason:"non-xml", url } };
    a11Cache.set(url, { expiry: now + A11_TTL_MS, value });
    return value;
  }
  const parsed = parseEntsoeA11(text);
  const value = { ok: parsed.ok, points: parsed.points, meta: { ...parsed.meta, status: res.status, url } };
  a11Cache.set(url, { expiry: now + A11_TTL_MS, value });
  return value;
}

// Low-level A11 request without caching; used by retry builder
async function entsoeA11Raw(token: string, inDomain: string, outDomain: string, start: Date, end: Date) {
  const periodStart = toPeriod(start);
  const periodEnd   = toPeriod(end);
  const url = `${ENTSOE_BASE}?securityToken=${encodeURIComponent(token)}&documentType=A11&in_Domain=${inDomain}&out_Domain=${outDomain}&periodStart=${periodStart}&periodEnd=${periodEnd}`;
  const res = await fetch(url, { headers: { "Accept": "application/xml" }, redirect: "manual" as RequestRedirect, cache: "no-store" });
  const text = await res.text();
  const ctype = res.headers.get("content-type") || "";
  const isXML = ctype.includes("xml");
  return { status: res.status, isXML, text, url };
}

// Try with (mtu, windowMin), and on 400 ack retry with coarser MTU/window
async function entsoeA11WithRetry(token: string, inDomain: string, outDomain: string, now: Date, prefMtuMin: number) {
  const plans = [
    { mtu: prefMtuMin, windowMin: Math.max(prefMtuMin * 2, 60) }, // e.g., 30→60, 15→60
    { mtu: 30,         windowMin: 120 },
    { mtu: 60,         windowMin: 180 },
  ];
  const attempts: any[] = [];

  for (const plan of plans) {
    const start = alignDown(addMinutes(now, -plan.windowMin), plan.mtu);
    const end   = alignDown(now, plan.mtu);
    const resp  = await entsoeA11Raw(token, inDomain, outDomain, start, end);
    const rec: any = { url: resp.url, status: resp.status, mtu: plan.mtu, windowMin: plan.windowMin };

    if (!resp.isXML) { rec.reason = "non-xml"; attempts.push(rec); continue; }
    if (resp.status === 400 && resp.text.includes("Acknowledgement_MarketDocument")) {
      rec.reason = ackReason(resp.text) || "ack";
      attempts.push(rec);
      // retry with next plan
      continue;
    }
    // success or at least a proper Publication doc; hand to parser
    attempts.push(rec);
    return { ok: true, xml: resp.text, attempts };
  }
  return { ok: false, xml: "", attempts };
}

// Compute net GB imports for a border at the latest aligned timestamp: net = partner->GB minus GB->partner
async function entsoeNetForBorderMW(token: string, partnerEIC: string, prefMtuMin: number, now: Date) {
  // partner → GB
  const into = await entsoeA11WithRetry(token, partnerEIC, GB_EIC, now, prefMtuMin);
  // GB → partner
  const from = await entsoeA11WithRetry(token, GB_EIC, partnerEIC, now, prefMtuMin);

  const attempts = { into: into.attempts, from: from.attempts };

  if (!into.ok && !from.ok) {
    return { ok: false, t: null, netMW: 0, detail: attempts, reason: "no-xml" };
  }

  const intoPoints = into.ok ? parseEntsoeA11(into.xml).points : [];
  const fromPoints = from.ok ? parseEntsoeA11(from.xml).points : [];

  const tsSet = new Set<string>();
  intoPoints.forEach(p => tsSet.add(p.t));
  fromPoints.forEach(p => tsSet.add(p.t));
  const latestT = Array.from(tsSet).sort().pop() || null;
  if (!latestT) {
    return { ok: false, t: null, netMW: 0, detail: attempts, reason: "no-points" };
  }

  const a = intoPoints.filter(p => p.t === latestT).reduce((s,p)=>s+p.quantity,0);
  const b = fromPoints.filter(p => p.t === latestT).reduce((s,p)=>s+p.quantity,0);
  return { ok: true, t: latestT, netMW: Math.round(b - a), detail: attempts };
}

// ---- Interconnector helpers ----
const IC_CODE_MAP: Record<string, { name: string; country: string; capacity?: number }> = {
  // France cluster
  INTFR:   { name: "IFA",          country: "France",             capacity: 2000 },
  INTFR2:  { name: "IFA2",         country: "France",             capacity: 1000 },
  INTELEC: { name: "ElecLink",     country: "France",             capacity: 1000 },
  INTIFA2: { name: "IFA2",         country: "France",             capacity: 1000 }, // alt code seen in wild
  // Belgium
  INTNEM:  { name: "Nemo Link",    country: "Belgium",            capacity: 1000 },
  INTBEL:  { name: "Nemo Link",    country: "Belgium",            capacity: 1000 }, // legacy code variant
  // Netherlands
  INTNED:  { name: "BritNed",      country: "Netherlands",        capacity: 1000 },
  // Norway
  INTNSL:  { name: "NSL",          country: "Norway",             capacity: 1400 },
  INTNOR:  { name: "NSL",          country: "Norway",             capacity: 1400 }, // alt code
  // Ireland (matching ENTSO-E border names)
  INTEW:   { name: "EWIC",         country: "Ireland",            capacity: 500  },
  INTIRL:  { name: "Moyle",        country: "Northern Ireland",   capacity: 500  },
  // Denmark (matching ENTSO-E border names)
  INTDK1:  { name: "Viking Link",  country: "Denmark",            capacity: 1400 },
  INTDK2:  { name: "Denmark West", country: "Denmark",            capacity: 700 },
};

function isInterconnectorCode(code?: string) {
  if (!code) return false;
  const u = code.toUpperCase();
  return u.startsWith("INT") && (u in IC_CODE_MAP);
}

// Normalize an “interconnector summary” row from BMRS
function normalizeICSummaryRow(r: any) {
  const code = (r.fuelType || r.code || r.icCode || r.InterconnectorCode || "").toUpperCase();
  const map = IC_CODE_MAP[code];
  if (!map) return null;

  const mw =
    num(r.flow_mw) ?? num(r.flow) ?? num(r.mw) ?? num(r.value) ?? num(r.generation);
  if (!Number.isFinite(mw)) return null;

  return {
    code,
    name: map.name,
    country: map.country,
    flow: mw, // MW; positive = import to GB
    capacity: map.capacity ?? num(r.capacity) ?? null,
  };
}

// Fallback: derive interconnectors from Generation Outturn Summary rows
function deriveICFromOutturnRows(rows: any[]) {
  const byCode = new Map<string, { code: string; name: string; country: string; flow: number; capacity: number | null }>();
  for (const r of rows) {
    const code = String(r.fuelType || (r.FUEL_TYPE ?? r.FUELTYPE) || "").toUpperCase();
    if (!isInterconnectorCode(code)) continue;

    const map = IC_CODE_MAP[code];
    if (!map) continue;

    const mw =
      num(r.generation) ?? num(r.GENERATION_MW) ?? num(r.mw) ?? num(r.MWH) ?? NaN;
    if (!Number.isFinite(mw)) continue;

    const existing = byCode.get(code);
    const flow = (existing?.flow ?? 0) + mw;
    byCode.set(code, { code, name: map.name, country: map.country, flow, capacity: map.capacity ?? null });
  }
  return Array.from(byCode.values());
}

// Variant-aware derivation: insights rows are already MW; dataset rows are MWh per 30m → MW via ×2
function deriveICFromOutturnRowsVariant(rows: any[], variant: "insights" | "dataset") {
  const byCode = new Map<string, { code: string; name: string; country: string; flow: number; capacity: number | null }>();
  for (const r of rows) {
    const code = String(r.fuelType ?? r.FUEL_TYPE ?? r.FUELTYPE ?? r.code ?? "").toUpperCase();
    if (!isInterconnectorCode(code)) continue;
    const def = IC_CODE_MAP[code];
    if (!def) continue;

    let mw: number | null = null;
    if (variant === "insights") {
      mw = Number(r.generation ?? r.generationMW ?? r.GENERATION_MW ?? r.value ?? r.mw);
    } else {
      const mwh = Number(r.MWH ?? r.ENERGY_MWH ?? r.energy ?? r.VALUE ?? r.value);
      mw = Number.isFinite(mwh) ? mwh * 2 : Number(r.generation ?? r.GENERATION_MW ?? NaN);
    }
    if (!Number.isFinite(mw)) continue;

    const prev = byCode.get(code);
    const flow = (prev?.flow ?? 0) + (mw as number);
    byCode.set(code, { code, name: def.name, country: def.country, flow, capacity: def.capacity ?? null });
  }
  return Array.from(byCode.values());
}

// Strict JSON fetch that rejects HTML shells
async function safeGetJson(url: string): Promise<{ ok: boolean; status: number; contentType: string; json?: any; reason?: string }> {
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", redirect: "manual" as RequestRedirect });
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (!contentType.toLowerCase().includes("json")) {
      return { ok: false, status: res.status, contentType, reason: "non-json" };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, contentType, reason: "http-error" };
    }
    try {
      const json = JSON.parse(text);
      return { ok: true, status: res.status, contentType, json };
    } catch {
      return { ok: false, status: res.status, contentType, reason: "json-parse-failed" };
    }
  } catch (e) {
    return { ok: false, status: 0, contentType: "", reason: (e as Error)?.message || "fetch-error" };
  }
}

async function fetchICSummaryCandidates(anchor: { date: string; period: number }) {
  const hosts = [
    "https://data.elexon.co.uk",
    "https://bmrs.elexon.co.uk",
  ];
  const urls: string[] = [];
  for (const host of hosts) {
    urls.push(`${host}/bmrs/api/v1/balancing/interconnector/summary/latest?format=json`);
    urls.push(`${host}/bmrs/api/v1/balancing/interconnector/summary?settlementDate=${encodeURIComponent(anchor.date)}&settlementPeriod=${anchor.period}&format=json`);
  }
  const attempts: any[] = [];
  for (const url of urls) {
    const res = await safeGetJson(url);
    attempts.push({ url, ok: res.ok, status: res.status, ctype: res.contentType, reason: res.reason, variant: url.includes('/latest') ? 'summary-latest' : 'summary-bysp' });
    if (res.ok && Array.isArray(res.json?.data)) {
      const parsed = res.json.data
        .map(normalizeICSummaryRow)
        .filter(Boolean);
      if (parsed.length) return { data: parsed, source: "summary", attempts };
    }
  }
  return { data: [] as any[], source: "none", attempts };
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

  // Read request body for debug parameters
  let requestBody: any = {};
  try {
    if (req.method === "POST" || req.headers.get("content-type")?.includes("application/json")) {
      requestBody = await req.json();
    }
  } catch {
    // Ignore body parsing errors
  }

  // Check debug mode from both URL and request body
  const DEBUG = qDebug(req.url) || requestBody.debug === 1 || requestBody.debug === true;
  const EU_FOCUS = requestBody.euFocus === true;
  
  // Check update type for multi-frequency updates (preserve existing functionality)
  const url = new URL(req.url);
  const UPDATE_TYPE = url.searchParams.get('updateType') || requestBody.updateType || 'full';
  
  if (DEBUG) dlog(true, `Update type: ${UPDATE_TYPE}`);

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

  function parseInterconnectors(icData: any) {
    // Handle column+data array shapes
    if ((Array.isArray(icData?.columns) || Array.isArray(icData?.meta)) && Array.isArray(icData?.data) && Array.isArray(icData.data[0])) {
      const cols: string[] = Array.isArray(icData.columns) ? icData.columns : icData.meta;
      const data: any[] = icData.data;
      const mapped = data.map((arr: any[]) => {
        const o: Record<string, any> = {};
        for (let i = 0; i < cols.length; i++) o[cols[i]] = arr[i];
        return o;
      });
      icData = mapped;
    }

    const icRows = asArray(icData);
    const toNumKeys = ["flow","flowMW","mw","value","ieFlow","actualFlowMW","actualFlow","netFlow","NET_FLOW","flow_value"];
    const capKeys   = ["capacity","cap","maxCapacity","capacityMW","ratedCapacity","capacity_mw","MAX_CAPACITY_MW"];
    const nameKeys  = ["interconnectorName","name","connector","id","interconnector","icName","IC_NAME"];
    const ctryKeys  = ["country","counterparty","counterParty","partner","area","eic","EIC"];

    return icRows.map((r: any) => ({
      name:     pickStr(r, nameKeys) || "Unknown",
      country:  pickStr(r, ctryKeys) || "",
      flow:     pickNum(r, toNumKeys) ?? 0,
      capacity: pickNum(r, capKeys),
    }));
  }
  function parseDemand(dData: any): number {
    const dRows = asArray(dData);
    const national = dRows.find((r:any) => String(pickStr(r, ["region","area","name"]) || "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0] ?? {};
    const totalDemandMW = pickNum(national, ["demand","demandMW","mw","value","totalDemandMW"]) ?? 0;
    return Math.round((totalDemandMW/1000)*100)/100;
  }

  try {
    // Fetch data sources in parallel (BMRS + Demand + EU Generation; IC handled separately)
    const [bmrsR, demandR, euGenerationMix] = await Promise.all([
      fetchBMRSGeneration(),
      fetchDemand(),
      fetchEUGenerationMix(DEBUG, EU_FOCUS),
    ]);

    if (DEBUG) dlog(true, "Data fetch results:", { 
      bmrs: { ok: bmrsR.ok, variant: bmrsR.variant, status: (bmrsR as any).status }, 
      demand: { ok: demandR.ok } 
    });

    // Resolve BMRS HV baseline → dataset fallback → LKG
let hvByFuelMW: Record<string, number> = {};
let anchorSP = 0;
let anchorDate = "";
let variant = bmrsR.variant;
let bmrsRows: any[] = [];
let outturnVariant: "insights" | "dataset" = "insights";
let latestOutturnRows: any[] = [];

    if (!bmrsR.ok) {
      if (DEBUG) dlog(true, "BMRS failed, trying dataset fallback...");
const ds = await fetchFUELHHStream(200);
if (ds.ok) {
  const rows = asArray(ds.data);
  const parsed = parseFUELHHtoMW(rows);
  hvByFuelMW = parsed.hvByFuelMW; anchorSP = parsed.anchorSP; anchorDate = parsed.anchorDate; variant = "dataset-fuelhh-stream";
  latestOutturnRows = pickLatestSP(rows);
  outturnVariant = "dataset";
} else {
        const lkgResponse = await serveLKG("BMRS unavailable; served LKG");
        if (lkgResponse) return lkgResponse;
        const stub = { generationMix: [], interconnectors: [], totalGenerationMW: 0, totalDemandMW: 0, lastUpdated: new Date().toISOString(), dataFreshness: { source: "BMRS", isRealtime: false, note: "BMRS unavailable", variant: "stub" } };
        if (DEBUG) (stub as any).diagnostics = { reason: "bmrs-failed", variant: "stub" };
        return new Response(JSON.stringify(stub), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
      }
    } else {
      // Parse BMRS HV generation
bmrsRows = asArray(bmrsR.data);
const parsed = parseBMRSHVGeneration(bmrsRows);
hvByFuelMW = parsed.hvByFuelMW; anchorSP = parsed.anchorSP; anchorDate = parsed.anchorDate;
latestOutturnRows = pickLatestSP(bmrsRows);
outturnVariant = "insights";
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
    latestOutturnRows = pickLatestSP(rows);
    outturnVariant = "dataset";
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
      fetchEmbeddedSolarPVLive(anchorEndISO, DEBUG),
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

// Interconnector flows - now showing all possible interconnectors with status
let interconnectors: Array<{ name:string; country:string; flow:number; capacity:number|null; status?:'live'|'offline'|'unavailable'; asOf?:string|null }> = [];
let interconnectorStatus: "live" | "cached" | "unavailable" = "unavailable";
let icDiag: any = { source: "enhanced", ok: false, tries: [] as any[], status: "none" };

try {
  // Use the new enhanced method that shows all possible interconnectors
  const icResult = await fetchAllInterconnectorsWithStatus(DEBUG);
  
  interconnectors = icResult.interconnectors; // Always populated with all borders
  interconnectorStatus = icResult.status;
  
  if (DEBUG) {
    icDiag.ok = true;
    icDiag.status = interconnectorStatus;
    icDiag.source = "entso-e-all-borders";
    icDiag.tries = icResult.attempts || [];
    icDiag.count = interconnectors.length;
    icDiag.liveCount = interconnectors.filter(ic => ic.status === 'live').length;
  }
} catch (e) {
  if (DEBUG) dlog(true, `IC resolution error: ${e.message}`);
  
  // Fallback: show all interconnectors as unavailable
  interconnectors = ENTSOE_BORDERS.map(border => ({
    name: border.displayName,
    country: border.country,
    flow: 0,
    capacity: CAPACITY_HINTS[border.name] || null,
    status: 'unavailable' as const
  }));
  interconnectorStatus = "unavailable";
}

    const totalDemand = demandR.ok ? parseDemand(demandR.data) : 0;

    const fullLive = variant.startsWith("outturn-") && windEmb.matched && solarEmb.matched;

    const payload: any = {
      generationMix,
      interconnectors,
      euGenerationMix,
      totalGenerationMW: Math.round(totalGenerationMW),
      totalDemandMW: Math.round(totalDemand * 1000),
      units: "MW",
      lastUpdated: new Date().toISOString(),
dataFreshness: {
  source: "BMRS HV + ESO + PV Live",
  isRealtime: true,
  variant,
  interconnectorStatus,
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
    solar: { 
      reason: solarEmb.reason, 
      matched: solarEmb.matched, 
      mw: solarEmb.mw, 
      columns: (solarEmb as any).debug?.columns ?? null, 
      picked: (solarEmb as any).debug?.picked ?? null,
      anchorEndISO,
      effectiveAnchorISO: new Date(Math.min(Date.parse(anchorEndISO), Date.now())).toISOString(),
      deltaMinutes: (() => {
        const p = Date.parse(((solarEmb as any).debug?.picked?.t) ?? "");
        const eff = Math.min(Date.parse(anchorEndISO), Date.now());
        return Number.isFinite(p) ? Math.round((eff - p) / 60000) : null;
      })()
    },
    euMix: {
      count: euGenerationMix.length,
      sampleCountries: euGenerationMix.slice(0, 2).map(c => ({
        name: c.countryName || c.country,
        total: c.totalMW,
        fuels: Object.keys(c.fuelMix || {}).length
      })),
      ...(EU_FOCUS && {
        allCountries: euGenerationMix.map(c => ({
          name: c.countryName || c.country,
          total: c.totalMW,
          fuelMix: c.fuelMix,
          timestamp: c.timestamp
        })),
        euFocusMode: true,
        detailedLogs: "Check server logs for detailed ENTSO-E API call information"
      })
    },
    icOk: interconnectors.length > 0,
    icCount: interconnectors.length,
    icSource: (
      ((icDiag?.sourceCounts?.entsoe || 0) > 0 ? 1 : 0) +
      ((icDiag?.sourceCounts?.bmrs || 0) > 0 ? 1 : 0) +
      ((icDiag?.sourceCounts?.outturn || 0) > 0 ? 1 : 0)
    ) > 1
      ? 'mixed'
      : ((icDiag?.sourceCounts?.entsoe || 0) > 0
        ? 'entsoe-a11'
        : ((icDiag?.sourceCounts?.bmrs || 0) > 0
          ? 'bmrs-summary'
          : ((icDiag?.sourceCounts?.outturn || 0) > 0
            ? 'outturn'
            : (interconnectorStatus === 'cached' ? 'lkg' : 'none')))),
    icStatus: interconnectorStatus,
    icAttempts: icDiag.tries,
    icSample: interconnectors.slice(0, 3),
    ic: { ok: icDiag.ok, count: interconnectors.length, source: (
      ((icDiag?.sourceCounts?.entsoe || 0) > 0 ? 1 : 0) +
      ((icDiag?.sourceCounts?.bmrs || 0) > 0 ? 1 : 0) +
      ((icDiag?.sourceCounts?.outturn || 0) > 0 ? 1 : 0)
    ) > 1
      ? 'mixed'
      : ((icDiag?.sourceCounts?.entsoe || 0) > 0
        ? 'entsoe-a11'
        : ((icDiag?.sourceCounts?.bmrs || 0) > 0
          ? 'bmrs-summary'
          : ((icDiag?.sourceCounts?.outturn || 0) > 0
            ? 'outturn'
            : (icDiag.status === 'cached' ? 'lkg' : 'none')))), status: icDiag.status, tries: icDiag.tries, sourcesByBorder: icDiag.sourcesByBorder },
  };
}

// Ensure we never regress LKG: carry forward ICs if empty before persisting
if (!Array.isArray(payload.interconnectors) || payload.interconnectors.length === 0) {
  try {
    const lastIC = await getLastInterconnectorsFromLKG();
    if (lastIC && lastIC.length) {
      payload.interconnectors = lastIC;
      payload.dataFreshness = { ...(payload.dataFreshness || {}), interconnectorStatus: "cached" };
    }
  } catch {}
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