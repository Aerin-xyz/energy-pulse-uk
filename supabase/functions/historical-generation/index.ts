import { 
  checkRateLimit, 
  getClientIP,
  validateOptionalEnum,
  ValidationError
} from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Browser-like headers reduce WAF surprises
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": UA,
  Origin: "https://bmrs.elexon.co.uk",
  Referer: "https://bmrs.elexon.co.uk/",
  "Accept-Language": "en-GB",
} as Record<string,string>;

// Map BMRS fuel types to our simplified categories
const FUEL_TYPE_MAPPING: { [key: string]: string } = {
  'CCGT': 'Gas',
  'OCGT': 'Gas', 
  'WIND': 'Wind',
  'NUCLEAR': 'Nuclear',
  'NPSHYD': 'Hydro',
  'PS': 'PSH',
  'COAL': 'Coal',
  'OIL': 'Other',
  'BIOMASS': 'Biomass',
  'INTFR': 'Imports',
  'INTIRL': 'Imports',
  'INTNED': 'Imports',
  'INTBEL': 'Imports',
  'INTEW': 'Imports',
  'INTNEM': 'Imports',
  'INTNSL': 'Imports',
  'INTDK1': 'Imports',
  'INTELEC': 'Imports',
  'INTIFA2': 'Imports',
  'OTHER': 'Other'
};

/*** Time helpers for FUELHH ***/
function pad2(n:number){ return n.toString().padStart(2,"0"); }
function toISO(d: Date){ return new Date(d.getTime()).toISOString(); }
function addMinutes(d: Date, m: number){ return new Date(d.getTime() + m*60*1000); }
function alignDownHalfHour(d: Date){
  const z = new Date(d);
  const mm = z.getUTCMinutes();
  z.setUTCMinutes(mm < 30 ? 0 : 30, 0, 0);
  return z;
}

/** Settlement helpers */
function ymdUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function startOfUTCDay(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0,0,0)); }
function addDays(d: Date, n: number) { return new Date(d.getTime() + n*24*60*60*1000); }

/*** Resilient fetch that insists on JSON ***/
async function fetchJsonStrict(url: string){
  const res = await fetch(url, { headers: { Accept: "application/json" }, redirect: "manual" as RequestRedirect, cache: "no-store" });
  const ctype = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  if (!ctype.includes("json")) throw new Error(`non-json for ${url}`);
  try { return JSON.parse(text); } catch { throw new Error(`json-parse-failed for ${url}`); }
}

/*** BMRS FUELHH resolver (dataset) ***/
async function fetchFUELHHWindow(fromISO: string, toISO: string, DEBUG=false){
  const qs = (base: string) =>
    `${base}/bmrs/api/v1/datasets/FUELHH?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}&format=json`;
  const candidates = [
    qs("https://data.elexon.co.uk"),
    qs("https://bmrs.elexon.co.uk"),
    `${qs("https://data.elexon.co.uk")}&stream=true`,
    `${qs("https://bmrs.elexon.co.uk")}&stream=true`,
  ];
  const attempts: any[] = [];
  for (const url of candidates){
    try{
      const j = await fetchJsonStrict(url);
      if (DEBUG) attempts.push({ url, ok:true, sample: Array.isArray(j.data)? j.data.slice(0,2): j.data });
      const rows: any[] = Array.isArray(j?.data) ? j.data : [];
      if (rows.length) return { ok:true, rows, attempts };
    }catch(e:any){
      attempts.push({ url, ok:false, reason: e?.message?.slice(0,140) });
    }
  }
  return { ok:false, rows:[], attempts };
}

/** Fetch FUELHH by settlement filters (7-day window), with host + stream fallbacks */
async function fetchFuelHHBySettlement(settlementDateFrom: string, settlementDateTo: string, DEBUG=false){
  const mk = (host: string) =>
    `${host}/bmrs/api/v1/datasets/FUELHH?settlementDateFrom=${encodeURIComponent(settlementDateFrom)}&settlementDateTo=${encodeURIComponent(settlementDateTo)}&settlementPeriodFrom=1&settlementPeriodTo=50&format=json&stream=true`;

  const candidates = [
    mk("https://data.elexon.co.uk"),
    mk("https://bmrs.elexon.co.uk"),
  ];

  const attempts: any[] = [];
  for (const url of candidates){
    try {
      const j = await fetchJsonStrict(url);
      const rows = Array.isArray(j?.data) ? j.data : [];
      if (DEBUG) attempts.push({ url, ok:true, count: rows.length });
      if (rows.length) return { ok:true, rows, attempts };
    } catch (e:any) {
      attempts.push({ url, ok:false, reason: String(e.message).slice(0,160) });
    }
  }
  return { ok:false, rows:[], attempts };
}

/*** Normalise FUELHH to { periodStartISO, fuel, mw } ***/
function normaliseFuelHH(rows: any[], DEBUG=false){
  const out: Array<{ periodStartISO:string; fuel:string; mw:number }> = [];
  for (const r of rows){
    const fuel = r.fuelType || r.fuel || r.FUELTYPE || r.FUEL || r.type || "OTHER";
    let tISO: string | null =
      r.startTime || r.periodStart || r.start || r.STARTTIME || r.START || null;
    let sp = Number(r.settlementPeriod ?? r.SETTLEMENTPERIOD ?? r.sp ?? 0);
    let dstr = r.settlementDate || r.SETTLEMENTDATE || r.date || null;

    const mwRaw = r.generation ?? r.MW ?? r.quantity ?? r.VALUE ?? r.value;
    const mw = Number(mwRaw);
    if (!Number.isFinite(mw)) continue;

    if (!tISO){
      if (dstr && sp > 0){
        const y = Number(dstr.slice(0,4)), m = Number(dstr.slice(5,7)), d = Number(dstr.slice(8,10));
        const base = new Date(Date.UTC(y, m-1, d, 0, 0, 0));
        tISO = toISO(addMinutes(base, (sp-1)*30));
      }else{
        continue;
      }
    }
    out.push({ periodStartISO: new Date(tISO).toISOString(), fuel: String(fuel).toUpperCase(), mw });
  }
  out.sort((a,b)=> a.periodStartISO.localeCompare(b.periodStartISO));
  return out;
}

/*** Aggregate HV by SP & fuel (exclude interconnectors & PS pumping) ***/
const INTERCONNECTOR_CODES = new Set(["INTFR","INTNED","INTBEL","INTNEM","INTIRL","INTEW","INTNSL","INTIFA2","INTELEC","INTNL","INTDK1","INTGRNL","INTVKL"]);
function isInterconnectorFuel(fuel: string){
  fuel = fuel.toUpperCase();
  if (INTERCONNECTOR_CODES.has(fuel)) return true;
  return fuel.startsWith("INT");
}
function classifyFuel(f: string){
  const x = f.toUpperCase();
  if (x === "WIND") return "Wind";
  if (x === "NUCLEAR") return "Nuclear";
  if (x === "CCGT" || x === "OCGT" || x === "FOSSIL_GAS" || x === "GAS") return "Gas";
  if (x === "COAL") return "Coal";
  if (x === "BIOMASS") return "Biomass";
  if (x === "NPSHYD" || x === "PS" || x === "HYDRO") return "Hydro";
  return "Other";
}
type FuelRow = { periodStartISO:string; fuels: Record<string, number> };
function aggregateHV(rows: ReturnType<typeof normaliseFuelHH>){
  const map = new Map<string, FuelRow>();
  for (const r of rows){
    if (isInterconnectorFuel(r.fuel)) continue;

    const label = classifyFuel(r.fuel);
    let mw = r.mw;
    if (label === "Hydro" && mw < 0){ continue; }

    const key = r.periodStartISO;
    if (!map.has(key)) map.set(key, { periodStartISO: key, fuels: {} });
    const row = map.get(key)!;
    row.fuels[label] = (row.fuels[label] ?? 0) + mw;
  }
  return Array.from(map.values()).sort((a,b)=> a.periodStartISO.localeCompare(b.periodStartISO));
}

/*** Rename existing PV Live function ***/
async function fetchPVLiveNationalSeries(startISO: string, endISO: string, DEBUG = false): Promise<Array<{t:string; mw:number}>> {
  const { data } = await fetchPVLiveNational(startISO, endISO, DEBUG);
  return data;
}

/*** Wind and Solar Forecast Fetching from BMRS ***/
interface ForecastDataPoint {
  timestamp: string;
  windForecastMW: number;
  solarForecastMW: number;
  source: 'day-ahead' | 'latest';
}

async function fetchWindSolarForecast(DEBUG = false): Promise<{ data: ForecastDataPoint[], source: string }> {
  console.log('[Forecast] Fetching wind and solar forecast data from BMRS');
  
  const forecastData: ForecastDataPoint[] = [];
  let source = 'none';
  
  // Try day-ahead wind and solar forecast first
  try {
    const dayAheadUrl = 'https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind-and-solar/day-ahead?format=json';
    if (DEBUG) console.log(`[Forecast] Trying day-ahead: ${dayAheadUrl}`);
    
    const response = await fetch(dayAheadUrl, { 
      headers: HEADERS, 
      cache: "no-store" 
    });
    
    if (response.ok) {
      const data = await response.json();
      if (DEBUG) console.log(`[Forecast] Day-ahead response:`, JSON.stringify(data).slice(0, 500));
      
      // BMRS returns array of forecast records
      const records = Array.isArray(data) ? data : (data?.data || []);
      
      for (const record of records) {
        // Day-ahead format has startTime, generation, and businessType (Wind/Solar)
        const timestamp = record.startTime || record.settlementDate;
        if (!timestamp) continue;
        
        // Find or create entry for this timestamp
        let entry = forecastData.find(f => f.timestamp === timestamp);
        if (!entry) {
          entry = {
            timestamp,
            windForecastMW: 0,
            solarForecastMW: 0,
            source: 'day-ahead'
          };
          forecastData.push(entry);
        }
        
        const genMW = Number(record.generation || record.quantity || 0);
        const businessType = (record.businessType || record.fuelType || '').toLowerCase();
        
        if (businessType.includes('wind')) {
          entry.windForecastMW = genMW;
        } else if (businessType.includes('solar')) {
          entry.solarForecastMW = genMW;
        }
      }
      
      if (forecastData.length > 0) {
        source = 'day-ahead';
        console.log(`[Forecast] Day-ahead loaded ${forecastData.length} forecast points`);
      }
    }
  } catch (error) {
    if (DEBUG) console.log(`[Forecast] Day-ahead error: ${error}`);
  }
  
  // If day-ahead failed, try latest wind forecast
  if (forecastData.length === 0) {
    try {
      const latestWindUrl = 'https://data.elexon.co.uk/bmrs/api/v1/forecast/generation/wind/latest?format=json';
      if (DEBUG) console.log(`[Forecast] Trying latest wind: ${latestWindUrl}`);
      
      const response = await fetch(latestWindUrl, { 
        headers: HEADERS, 
        cache: "no-store" 
      });
      
      if (response.ok) {
        const data = await response.json();
        const records = Array.isArray(data) ? data : (data?.data || []);
        
        for (const record of records) {
          const timestamp = record.startTime || record.publishTime;
          if (!timestamp) continue;
          
          forecastData.push({
            timestamp,
            windForecastMW: Number(record.generation || record.quantity || 0),
            solarForecastMW: 0, // Latest endpoint is wind-only
            source: 'latest'
          });
        }
        
        if (forecastData.length > 0) {
          source = 'latest-wind';
          console.log(`[Forecast] Latest wind loaded ${forecastData.length} forecast points`);
        }
      }
    } catch (error) {
      if (DEBUG) console.log(`[Forecast] Latest wind error: ${error}`);
    }
  }
  
  // Sort by timestamp
  forecastData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return { data: forecastData, source };
}

/*** Build the past-week series using FUELHH with settlement filters ***/
async function buildPastWeekGeneration(DEBUG=false){
  // Compute last 7 full UTC days up to "today"
  const todayUTC = startOfUTCDay(new Date());
  const dateTo   = ymdUTC(todayUTC);                // inclusive
  const dateFrom = ymdUTC(addDays(todayUTC, -7));   // inclusive 7 days back

  console.log(`[FUELHH-settlement] Fetching weekly data from ${dateFrom} to ${dateTo}`);

  // 1) BMRS HV outturn via settlement filters
  const fuelhh = await fetchFuelHHBySettlement(dateFrom, dateTo, DEBUG);
  if (DEBUG) console.log("[FUELHH-settlement] attempts", fuelhh.attempts?.slice(0,2));
  const hvRows = normaliseFuelHH(fuelhh.rows, DEBUG);      // ← use existing normaliser
  const hvAgg  = aggregateHV(hvRows);                      // ← and aggregator (excludes ICs, drops PS pumping)

  console.log(`[FUELHH-settlement] Processed ${hvRows.length} raw rows into ${hvAgg.length} aggregated periods`);
  if (DEBUG && hvAgg.length > 0) {
    console.log(`[FUELHH-settlement] Date range: ${dateFrom} to ${dateTo}, first period: ${hvAgg[0].periodStartISO}, last period: ${hvAgg[hvAgg.length-1].periodStartISO}`);
  }

  // 2) Solar from PV_Live for same calendar window (use existing fetch)
  const pvStartISO = `${dateFrom}T00:00:00Z`;
  const pvEndISO   = `${dateTo}T23:59:59Z`;
  let pv: Array<{t:string; mw:number}> = [];
  try { 
    pv = await fetchPVLiveNationalSeries(pvStartISO, pvEndISO, DEBUG); 
    if (DEBUG) console.log(`[PV_LIVE] fetched ${pv.length} records, sample:`, pv.slice(0, 3));
  }
  catch (e:any){ if (DEBUG) console.log("[PV_LIVE] failed", e?.message); }

  // 3) Join PV to half-hour SPs with effective anchor = min(periodEnd, now) & 45-min tolerance
  const pvIdx = pv.map(r => ({ ts:new Date(r.t).getTime(), mw: r.mw }))
                  .sort((a,b)=>a.ts-b.ts);

  const joined = hvAgg.map(sp => {
    const spStart = new Date(sp.periodStartISO);
    const spEnd   = addMinutes(spStart, 30);
    const effectiveAnchor = Math.min(spEnd.getTime(), Date.now());

    // find nearest PV row
    let best = null as {ts:number; mw:number} | null;
    let bestDt = Infinity;
    for (const row of pvIdx){
      const dt = Math.abs(row.ts - effectiveAnchor);
      if (dt < bestDt){ bestDt = dt; best = row; }
    }
    const within45 = bestDt <= 45*60*1000;
    const solar = within45 && best ? best.mw : 0;

    return {
      periodStartISO: sp.periodStartISO,
      fuels: {
        Solar: solar,
        Gas: Math.max(0, sp.fuels.Gas ?? 0),
        Wind: Math.max(0, sp.fuels.Wind ?? 0),
        Nuclear: Math.max(0, sp.fuels.Nuclear ?? 0),
        Hydro: Math.max(0, sp.fuels.Hydro ?? 0),
        Biomass: Math.max(0, sp.fuels.Biomass ?? 0),
        Coal: Math.max(0, sp.fuels.Coal ?? 0),
        Other: Math.max(0, sp.fuels.Other ?? 0)
      },
      flags: { solarMatched: within45 }
    };
  });

  return {
    dateFrom, dateTo,
    periods: joined.length,
    rows: joined,
    meta: {
      sourceHV: "BMRS FUELHH (settlement, stream)",
      sourceSolar: "PV_Live (national)",
      solarMatchedCount: joined.filter(r=>r.flags.solarMatched).length
    }
  };
}

const ENERGY_COLORS = {
  'Gas': '#F2553C',     // Coral Red
  'Wind': '#6BC1B0',    // Teal Blue
  'Nuclear': '#B8A4E8', // Pastel Purple
  'Solar': '#F7B633',   // Soft Mustard
  'Hydro': '#4F6C8D',   // Slate Indigo
  'Coal': '#C9BBA8',    // Light Mushroom
  'Biomass': '#94D1B2', // Cool Mint
  'Imports': '#D6D6D6', // Fog Grey
  'PSH': '#4F6C8D',     // Slate Indigo
  'Other': '#C9BBA8',   // Light Mushroom
  'Misc': '#C9BBA8'     // Light Mushroom
};

function withFormat(u: string): string {
  try { 
    const url = new URL(u); 
    url.searchParams.set("format","json"); 
    return url.toString(); 
  } catch { 
    return u.includes("?") ? `${u}&format=json` : `${u}?format=json`; 
  }
}

async function fetchBMRSHistoricalGeneration(period: string = '24h'): Promise<any> {
  const hosts = ["data.elexon.co.uk", "bmrs.elexon.co.uk"];
  
  // Calculate time range based on period
  const now = new Date();
  let toDate: string;
  let fromDate: string;
  
  if (period === '7d') {
    // For weekly data, request 14 days back to ensure we get 7 complete days
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    toDate = yesterday.toISOString().split('T')[0];
    fromDate = new Date(yesterday.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`[historical-generation] Weekly data range: ${fromDate} to ${toDate} (14 days requested)`);
  } else {
    // Default: Get 24 hours of data ending today
    toDate = now.toISOString().split('T')[0];
    fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log(`[historical-generation] Daily data range: ${fromDate} to ${toDate}`);
  }
  
  for (const host of hosts) {
    try {
      const baseUrl = `https://${host}/bmrs/api/v1/generation/outturn/summary`;
      const url = withFormat(`${baseUrl}?from=${fromDate}&to=${toDate}`);
      
      console.log(`Attempting historical fetch from: ${url}`);
      
      const response = await fetch(url, { 
        headers: HEADERS, 
        cache: "no-store" 
      });
      
      if (!response.ok) {
        console.log(`HTTP ${response.status} from ${host}`);
        continue;
      }
      
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("json")) {
        console.log(`Non-JSON response from ${host}: ${contentType}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`Successfully fetched historical data from ${host}`);
      return data;
      
    } catch (error) {
      console.log(`Error from ${host}: ${(error as Error).message}`);
      continue;
    }
  }
  
  throw new Error("All BMRS historical endpoints failed");
}

async function fetchPVLiveNational(startISO: string, endISO: string, debug = false): Promise<{ data: Array<{t: string, mw: number}>, source: string }> {
  console.log(`Fetching PV Live data from ${startISO} to ${endISO}`);
  
  // Try ESO Open Data first (preferred, no auth required)
  // Using the correct ESO dataset for embedded wind and solar forecasts
  try {
    const esoUrl = `https://data.nationalgrideso.com/api/3/action/datastore_search_sql?sql=SELECT * FROM "177f6fa4-de10-4ef4-8e31-e35c98b7a8b4" WHERE "DATETIME_GMT" >= '${startISO}' AND "DATETIME_GMT" <= '${endISO}' AND "FUEL_TYPE" = 'SOLAR' ORDER BY "DATETIME_GMT"`;
    
    if (debug) console.log(`Trying ESO Open Data: ${esoUrl}`);
    
    const esoResponse = await fetch(esoUrl, { 
      headers: { ...HEADERS, 'Accept': 'application/json' },
      cache: "no-store"
    });
    
    if (debug) console.log(`ESO response status: ${esoResponse.status}`);
    
    if (esoResponse.ok) {
      const esoData = await esoResponse.json();
      if (debug) console.log(`ESO response structure: ${JSON.stringify(esoData, null, 2)}`);
      
      if (esoData?.result?.records && Array.isArray(esoData.result.records) && esoData.result.records.length > 0) {
        const pvData = esoData.result.records
          .filter((record: any) => record.GENERATION_MW != null && Number.isFinite(Number(record.GENERATION_MW)) && Number(record.GENERATION_MW) >= 0)
          .map((record: any) => ({
            t: record.DATETIME_GMT,
            mw: Number(record.GENERATION_MW)
          }))
          .sort((a: {t: string, mw: number}, b: {t: string, mw: number}) => new Date(a.t).getTime() - new Date(b.t).getTime());
        
        if (debug) console.log(`ESO returned ${pvData.length} valid PV records, first few:`, pvData.slice(0, 3));
        return { data: pvData, source: 'eso' };
      }
    }
    
    if (debug) console.log(`ESO Open Data failed or returned no data: ${esoResponse.status}, text: ${await esoResponse.text()}`);
  } catch (error) {
    if (debug) console.log(`ESO Open Data error: ${error}`);
  }
  
  // Fallback to Sheffield Solar API (requires PVLIVE_API_KEY)
  try {
    // Check if we have the Sheffield API key
    const sheffieldApiKey = Deno.env.get('PVLIVE_API_KEY');
    if (!sheffieldApiKey) {
      if (debug) console.log('No PVLIVE_API_KEY found, skipping Sheffield API');
      return { data: [], source: 'none' };
    }
    
    const sheffieldUrl = `https://api.solar.sheffield.ac.uk/pvlive/api/v4/gsp/0?start=${startISO}&end=${endISO}&data_format=json`;
    
    if (debug) console.log(`Trying Sheffield Solar: ${sheffieldUrl}`);
    
    const sheffieldResponse = await fetch(sheffieldUrl, {
      headers: { 
        ...HEADERS,
        'Accept': 'application/json',
        'Authorization': `Bearer ${sheffieldApiKey}`
      },
      cache: "no-store"
    });
    
    if (sheffieldResponse.ok) {
      const sheffieldData = await sheffieldResponse.json();
      if (debug) console.log(`Sheffield response structure:`, JSON.stringify(sheffieldData, null, 2));
      
      let pvData: Array<{t: string, mw: number}> = [];
      
      // Handle Sheffield response format
      if (Array.isArray(sheffieldData.data) && Array.isArray(sheffieldData.meta)) {
        // Array format with columns
        const columns = sheffieldData.meta;
        if (debug) console.log(`Sheffield columns:`, columns);
        const datetimeIdx = columns.findIndex((col: string) => col.toLowerCase().includes('datetime'));
        const generationIdx = columns.findIndex((col: string) => col.toLowerCase().includes('generation_mw'));
        
        if (debug) console.log(`Sheffield column indices: datetime=${datetimeIdx}, generation=${generationIdx}`);
        
        if (datetimeIdx >= 0 && generationIdx >= 0) {
          pvData = sheffieldData.data
            .filter((row: any[]) => row[generationIdx] != null && Number.isFinite(Number(row[generationIdx])) && Number(row[generationIdx]) >= 0)
            .map((row: any[]) => ({
              t: row[datetimeIdx],
              mw: Number(row[generationIdx])
            }));
        }
      } else if (Array.isArray(sheffieldData) && sheffieldData.length > 0 && typeof sheffieldData[0] === 'object') {
        // Object format
        pvData = sheffieldData
          .filter((record: any) => record.generation_mw != null && Number.isFinite(Number(record.generation_mw)) && Number(record.generation_mw) >= 0)
          .map((record: any) => ({
            t: record.datetime_utc || record.datetime_gmt,
            mw: Number(record.generation_mw)
          }));
      }
      
      pvData = pvData.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
      
      if (debug) console.log(`Sheffield returned ${pvData.length} valid PV records, first few:`, pvData.slice(0, 3));
      return { data: pvData, source: 'sheffield' };
    }
    
    if (debug) console.log(`Sheffield API failed: ${sheffieldResponse.status}`);
  } catch (error) {
    if (debug) console.log(`Sheffield API error: ${error}`);
  }
  
  console.log('No PV Live data source available');
  return { data: [], source: 'none' };
}

async function processHistoricalData(rawData: any, pvLiveData: Array<{t: string, mw: number}>, pvSource: string, period: string = '24h', debug = false): Promise<any[]> {
  console.log(`Raw BMRS response structure:`, {
    hasData: !!rawData?.data,
    isDataArray: Array.isArray(rawData?.data),
    dataLength: rawData?.data?.length || 0,
    hasDirectArray: Array.isArray(rawData),
    directArrayLength: Array.isArray(rawData) ? rawData.length : 0,
    firstItemSample: rawData?.data?.[0] || rawData?.[0] || null,
    topLevelKeys: Object.keys(rawData || {})
  });

  // Handle different response formats - be flexible like energy-data function
  let dataArray: any[] = [];
  
  if (Array.isArray(rawData?.data)) {
    dataArray = rawData.data;
  } else if (Array.isArray(rawData)) {
    dataArray = rawData;
  } else if (rawData?.data && typeof rawData.data === 'object') {
    // Sometimes data might be nested differently
    const nestedData = Object.values(rawData.data).find(val => Array.isArray(val));
    if (nestedData) {
      dataArray = nestedData as any[];
    }
  }
  
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.error("No valid data array found in response:", rawData);
    throw new Error(`Invalid historical data structure - expected array but got: ${typeof rawData?.data || typeof rawData}`);
  }
  
  console.log(`Processing ${dataArray.length} historical data periods for ${period}`);
  
  if (period === '7d') {
    // Use new FUELHH approach for weekly data
    const weeklyResult = await buildPastWeekGeneration(debug);
    return convertFUELHHToExpectedFormat(weeklyResult, debug);
  }
  
  // Group by settlement period - each item already represents a complete settlement period
  const periodMap = new Map<string, any>();
  
  for (const item of dataArray) {
    // Extract date from startTime for grouping
    const startTime = new Date(item.startTime);
    const settlementDate = startTime.toISOString().split('T')[0];
    const key = `${settlementDate}-${item.settlementPeriod}`;
    
    // Skip if we've already processed this settlement period
    if (periodMap.has(key)) {
      console.log(`Duplicate settlement period detected: ${key}, skipping...`);
      continue;
    }
    
    // Initialize the settlement period data
    const period = {
      settlementDate: settlementDate,
      settlementPeriod: item.settlementPeriod,
      timestamp: item.startTime, // Use provided ISO timestamp directly
      fuelMix: {} as Record<string, number>,
      totalMW: 0,
      solarMatched: false
    };
    
    // Process fuel data - filter out interconnectors, handle pumped storage
    let hasUnmappedFuels = false;
    const unmappedFuels: string[] = [];
    
    if (item.data && Array.isArray(item.data)) {
      for (const fuelData of item.data) {
        // Skip interconnector imports for generation-by-fuel table
        if (fuelData.fuelType && fuelData.fuelType.startsWith('INT')) {
          continue;
        }
        
        // For pumped storage, only count positive values (generation), skip negative (pumping)
        if (fuelData.fuelType === 'PS' && (fuelData.generation || 0) < 0) {
          continue;
        }
        
        const mappedFuel = FUEL_TYPE_MAPPING[fuelData.fuelType];
        if (!mappedFuel) {
          hasUnmappedFuels = true;
          unmappedFuels.push(fuelData.fuelType);
          continue;
        }
        
        if (!period.fuelMix[mappedFuel]) {
          period.fuelMix[mappedFuel] = 0;
        }
        
        period.fuelMix[mappedFuel] += fuelData.generation || 0;
        period.totalMW += fuelData.generation || 0;
      }
      
      if (hasUnmappedFuels && debug) {
        console.log(`Unmapped BMRS fuel codes in ${key}:`, unmappedFuels);
      }
      
      // Add solar data using time alignment
      const periodStart = new Date(item.startTime);
      const periodEnd = new Date(periodStart.getTime() + 30 * 60 * 1000); // 30 minutes later
      const now = new Date();
      const effectiveAnchor = new Date(Math.min(periodEnd.getTime(), now.getTime()));
      
      let solarMW = 0;
      let solarMatched = false;
      let closestDelta = Infinity;
      let closestRowISO = '';
      
      if (pvLiveData.length > 0) {
        // Find closest PV Live row to effective anchor
        let closestRow = null;
        
        for (const pvRow of pvLiveData) {
          const pvTime = new Date(pvRow.t);
          const deltaMs = Math.abs(effectiveAnchor.getTime() - pvTime.getTime());
          const deltaMinutes = deltaMs / (1000 * 60);
          
          if (deltaMinutes < closestDelta) {
            closestDelta = deltaMinutes;
            closestRow = pvRow;
            closestRowISO = pvRow.t;
          }
        }
        
        // Accept if within 45 minutes tolerance
        if (closestRow && closestDelta <= 45) {
          solarMW = closestRow.mw;
          solarMatched = true;
        }
        
        if (debug && item.settlementPeriod === Math.max(...dataArray.map(d => d.settlementPeriod))) {
          // Log details for latest settlement period
          console.log(`Latest SP solar alignment: effectiveAnchor=${effectiveAnchor.toISOString()}, closest=${closestRowISO}, delta=${closestDelta.toFixed(1)}min, matched=${solarMatched}`);
        }
      }
      
      // Add solar to fuel mix
      period.fuelMix['Solar'] = solarMW;
      period.solarMatched = solarMatched;
      
      // Validation: Check if total is within realistic range (15-50 GW for UK)
      if (period.totalMW < 15000 || period.totalMW > 50000) {
        console.warn(`Settlement period ${key} has unrealistic total: ${period.totalMW} MW`);
      }
      
      console.log(`Settlement period ${key}: ${period.totalMW} MW total, Solar: ${solarMW} MW (matched: ${solarMatched}), ${Object.keys(period.fuelMix).length} fuel types`);
    }
    
    periodMap.set(key, period);
  }
  
  // Convert to array and calculate percentages
  const result = Array.from(periodMap.values())
    .map(period => ({
      ...period,
      fuelMix: Object.entries(period.fuelMix).map(([fuelType, mw]) => ({
        fuelType,
        mw: mw as number,
        percentage: period.totalMW > 0 ? Math.round(((mw as number) / period.totalMW) * 100) : 0,
        color: ENERGY_COLORS[fuelType as keyof typeof ENERGY_COLORS] || ENERGY_COLORS.Other
      }))
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Calculate solar match statistics
  const solarMatchedCount = result.filter(p => p.solarMatched).length;
  
  console.log(`Processed ${result.length} settlement periods, ${solarMatchedCount} with matched solar data`);
  return result;
}

function convertFUELHHToExpectedFormat(weeklyResult: any, debug = false): any[] {
  console.log(`[FUELHH] Converting ${weeklyResult.rows.length} periods to daily format`);
  
  // Group by day and calculate daily averages
  const dayMap = new Map<string, {
    date: string;
    periods: any[];
    fuelTotals: Record<string, number>;
    totalMW: number;
    solarTotalMW: number;
    solarMatchedPeriods: number;
    totalPeriods: number;
  }>();

  for (const period of weeklyResult.rows) {
    const startTime = new Date(period.periodStartISO);
    const dateKey = startTime.toISOString().split('T')[0];
    
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        periods: [],
        fuelTotals: {},
        totalMW: 0,
        solarTotalMW: 0,
        solarMatchedPeriods: 0,
        totalPeriods: 0
      });
    }
    
    const dayData = dayMap.get(dateKey)!;
    dayData.periods.push(period);
    dayData.totalPeriods++;
    
    // Accumulate fuel totals
    Object.entries(period.fuels).forEach(([fuel, mw]) => {
      if (!dayData.fuelTotals[fuel]) {
        dayData.fuelTotals[fuel] = 0;
      }
      dayData.fuelTotals[fuel] += mw as number;
    });
    
    dayData.totalMW += Object.values(period.fuels).reduce((sum: number, mw) => sum + (mw as number), 0);
    dayData.solarTotalMW += period.fuels.Solar as number;
    
    if (period.flags.solarMatched) {
      dayData.solarMatchedPeriods++;
    }
  }
  
  // Convert to expected daily format
  const result = Array.from(dayMap.values())
    .map(dayData => {
      // Calculate daily averages
      const dailyFuelMix: Record<string, number> = {};
      
      Object.entries(dayData.fuelTotals).forEach(([fuel, totalMW]) => {
        dailyFuelMix[fuel] = (totalMW * 0.5) / 1000; // Convert MW*periods to GWh (0.5h per period, ÷1000 for GW)
      });
      
      // Add validation for DST days or missing periods
      if (dayData.totalPeriods < 46) {
        console.log(`[FUELHH] Partial day detected: ${dayData.date} has only ${dayData.totalPeriods} periods`);
      }
      
      const dailyTotalGWh = Object.values(dailyFuelMix).reduce((sum, gwh) => sum + gwh, 0);
      const dayTimestamp = new Date(dayData.date + 'T12:00:00Z');
      
      return {
        settlementDate: dayData.date,
        settlementPeriod: 0,
        timestamp: dayTimestamp.toISOString(),
        fuelMix: Object.entries(dailyFuelMix).map(([fuelType, gwh]) => ({
          fuelType,
          mw: gwh * 1000, // Convert back to MWh for compatibility with existing frontend
          percentage: dailyTotalGWh > 0 ? Math.round((gwh / dailyTotalGWh) * 100) : 0,
          color: ENERGY_COLORS[fuelType as keyof typeof ENERGY_COLORS] || ENERGY_COLORS.Other
        })),
        totalMW: dailyTotalGWh * 1000, // Convert back to MWh for compatibility with existing frontend
        solarMatched: dayData.solarMatchedPeriods > 0,
        dayName: dayTimestamp.toLocaleDateString('en-US', { weekday: 'short' }),
        solarMatchedPeriods: dayData.solarMatchedPeriods,
        totalPeriods: dayData.totalPeriods
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-7); // Take most recent 7 days
  
  console.log(`[FUELHH] Converted to ${result.length} daily aggregates`);
  return result;
}

async function processWeeklyDataLegacy(dataArray: any[], pvLiveData: Array<{t: string, mw: number}>, pvSource: string, debug = false): Promise<any[]> {
  console.log(`Processing weekly aggregation for ${dataArray.length} periods`);
  
  // Group data by day
  const dayMap = new Map<string, {
    date: string;
    periods: any[];
    fuelTotals: Record<string, number>;
    totalMW: number;
    solarTotalMW: number;
    solarMatchedPeriods: number;
    totalPeriods: number;
  }>();
  
  const availableDates = new Set<string>();
  
  // Process each settlement period and group by day
  for (const item of dataArray) {
    const startTime = new Date(item.startTime);
    const dateKey = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    availableDates.add(dateKey);
    
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, {
        date: dateKey,
        periods: [],
        fuelTotals: {},
        totalMW: 0,
        solarTotalMW: 0,
        solarMatchedPeriods: 0,
        totalPeriods: 0
      });
    }
    
    const dayData = dayMap.get(dateKey)!;
    dayData.periods.push(item);
    dayData.totalPeriods++;
    
    // Process fuel data for this period
    if (item.data && Array.isArray(item.data)) {
      for (const fuelData of item.data) {
        // Skip interconnector imports
        if (fuelData.fuelType && fuelData.fuelType.startsWith('INT')) {
          continue;
        }
        
        // For pumped storage, only count positive values (generation)
        if (fuelData.fuelType === 'PS' && (fuelData.generation || 0) < 0) {
          continue;
        }
        
        const mappedFuel = FUEL_TYPE_MAPPING[fuelData.fuelType];
        if (!mappedFuel) continue;
        
        if (!dayData.fuelTotals[mappedFuel]) {
          dayData.fuelTotals[mappedFuel] = 0;
        }
        
        dayData.fuelTotals[mappedFuel] += fuelData.generation || 0;
        dayData.totalMW += fuelData.generation || 0;
      }
    }
    
    // Process solar data for this period
    const periodStart = new Date(item.startTime);
    const periodEnd = new Date(periodStart.getTime() + 30 * 60 * 1000);
    const now = new Date();
    const effectiveAnchor = new Date(Math.min(periodEnd.getTime(), now.getTime()));
    
    let solarMW = 0;
    let solarMatched = false;
    let closestDelta = Infinity;
    
    if (pvLiveData.length > 0) {
      let closestRow = null;
      
      for (const pvRow of pvLiveData) {
        const pvTime = new Date(pvRow.t);
        const deltaMs = Math.abs(effectiveAnchor.getTime() - pvTime.getTime());
        const deltaMinutes = deltaMs / (1000 * 60);
        
        if (deltaMinutes < closestDelta) {
          closestDelta = deltaMinutes;
          closestRow = pvRow;
        }
      }
      
      if (closestRow && closestDelta <= 45) {
        solarMW = closestRow.mw;
        solarMatched = true;
        dayData.solarMatchedPeriods++;
      }
    }
    
    dayData.solarTotalMW += solarMW;
  }
  
  // Log available dates for debugging
  const sortedDates = Array.from(availableDates).sort();
  console.log(`[historical-generation] Available dates: ${sortedDates.join(', ')} (${sortedDates.length} days)`);
  
  // Convert to daily aggregates and take only the most recent 7 days
  const allDailyData = Array.from(dayMap.values())
    .map(dayData => {
      // Calculate daily averages
      const dailyFuelMix: Record<string, number> = {};
      
      // Average fuel generation over the day (convert to average MW)
      Object.entries(dayData.fuelTotals).forEach(([fuel, totalMW]) => {
        dailyFuelMix[fuel] = totalMW / dayData.totalPeriods;
      });
      
      // Average solar generation over the day
      const avgSolarMW = dayData.solarTotalMW / dayData.totalPeriods;
      dailyFuelMix['Solar'] = avgSolarMW;
      
      // Calculate daily total (sum of all fuel averages)
      const dailyTotalMW = Object.values(dailyFuelMix).reduce((sum, mw) => sum + mw, 0);
      
      // Create daily data point
      const dayTimestamp = new Date(dayData.date + 'T12:00:00Z'); // Use noon as representative time
      
      return {
        settlementDate: dayData.date,
        settlementPeriod: 0, // Not applicable for daily data
        timestamp: dayTimestamp.toISOString(),
        fuelMix: Object.entries(dailyFuelMix).map(([fuelType, mw]) => ({
          fuelType,
          mw,
          percentage: dailyTotalMW > 0 ? Math.round((mw / dailyTotalMW) * 100) : 0,
          color: ENERGY_COLORS[fuelType as keyof typeof ENERGY_COLORS] || ENERGY_COLORS.Other
        })),
        totalMW: dailyTotalMW,
        solarMatched: dayData.solarMatchedPeriods > 0,
        dayName: dayTimestamp.toLocaleDateString('en-US', { weekday: 'short' }),
        solarMatchedPeriods: dayData.solarMatchedPeriods,
        totalPeriods: dayData.totalPeriods
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Take only the most recent 7 days of data
  const result = allDailyData.slice(-7);
  
  console.log(`Processed ${allDailyData.length} daily aggregates, returning most recent ${result.length} days`);
  return result;
}

function getPeriodTime(settlementPeriod: number): string {
  // Settlement periods are 30-minute intervals starting at 00:00
  const hours = Math.floor((settlementPeriod - 1) / 2);
  const minutes = ((settlementPeriod - 1) % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00Z`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  const url = new URL(req.url);

  // Input validation
  let period: string;
  try {
    period = validateOptionalEnum(
      url.searchParams.get('period'),
      ['24h', '7d'],
      'period'
    ) || '24h';
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  // Debug mode is now disabled for unauthenticated requests (security improvement)
  const debug = false;

  // Rate limiting (5 req/min, 15 req/hour)
  const rateLimitResult = await checkRateLimit('historical-generation', clientIP, {
    requestsPerMinute: 50,
    requestsPerHour: 400,
  });

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        ...rateLimitResult.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    console.log("Starting historical generation fetch");
    
    let processedData: any[];
    let pvSource = 'none';
    let pvLiveData: Array<{t: string, mw: number}> = [];
    let forecastData: ForecastDataPoint[] = [];
    let forecastSource = 'none';
    
    // Check if forecast data is requested
    const includeForecast = url.searchParams.get('includeForecast') === 'true';
    
    if (period === '7d') {
      // Use FUELHH for weekly data
      processedData = await buildPastWeekGeneration(debug).then(result => convertFUELHHToExpectedFormat(result, debug));
      pvSource = 'fuelhh-integrated';
    } else {
      // Use existing approach for daily data
      const rawData = await fetchBMRSHistoricalGeneration(period);
      
      const now = new Date();
      const startISO = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
      const endISO = now.toISOString();
      
      const pvData = await fetchPVLiveNational(startISO, endISO, debug);
      pvLiveData = pvData.data;
      pvSource = pvData.source;
      processedData = await processHistoricalData(rawData, pvLiveData, pvSource, period, debug);
    }
    
    // Fetch forecast data if requested
    if (includeForecast) {
      const forecast = await fetchWindSolarForecast(debug);
      forecastData = forecast.data;
      forecastSource = forecast.source;
      console.log(`[Forecast] Fetched ${forecastData.length} forecast points from ${forecastSource}`);
    }
    
    // Calculate statistics
    const solarMatchedCount = processedData.filter(p => p.solarMatched).length;
    
    const response = {
      data: processedData,
      lastUpdated: new Date().toISOString(),
      totalPeriods: processedData.length,
      meta: {
        period,
        periods: processedData.length,
        solarMatchedCount,
        pvSource,
        ...(period === '7d' && {
          solarMatchedDays: solarMatchedCount,
          totalDays: processedData.length
        })
      },
      // Include forecast data in response if requested
      ...(includeForecast && {
        forecast: {
          data: forecastData,
          source: forecastSource,
          count: forecastData.length
        }
      }),
      ...(debug && period !== '7d' && {
        diagnostics: {
          pv: {
            totalRows: pvLiveData.length,
            samples: pvLiveData.slice(0, 3).map(row => ({ t: row.t, mw: row.mw })),
            source: pvSource
          }
        }
      })
    };
    
    const responseBody = JSON.stringify(response);

    return new Response(responseBody, {
      headers: { 
        ...corsHeaders, 
        ...rateLimitResult.headers,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Error in historical-generation function:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});