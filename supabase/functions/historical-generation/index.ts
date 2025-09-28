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

const ENERGY_COLORS = {
  'Gas': '#3B82F6',
  'Wind': '#10B981',
  'Nuclear': '#6B7280',
  'Solar': '#F59E0B',
  'Hydro': '#06B6D4',
  'Coal': '#EF4444',
  'Biomass': '#A16207',
  'Imports': '#8B5CF6',
  'PSH': '#06B6D4',
  'Other': '#6B7280',
  'Misc': '#6B7280'
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
  const toDate = now.toISOString().split('T')[0];
  let fromDate: string;
  
  if (period === '7d') {
    // Get 7 days of data
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else {
    // Default: Get 24 hours of data
    fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
    return await processWeeklyData(dataArray, pvLiveData, pvSource, debug);
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

async function processWeeklyData(dataArray: any[], pvLiveData: Array<{t: string, mw: number}>, pvSource: string, debug = false): Promise<any[]> {
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
  
  // Process each settlement period and group by day
  for (const item of dataArray) {
    const startTime = new Date(item.startTime);
    const dateKey = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
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
  
  // Convert to daily aggregates
  const result = Array.from(dayMap.values())
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
  
  console.log(`Processed ${result.length} daily aggregates`);
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

  try {
    console.log("Starting historical generation fetch");
    
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';
    const period = url.searchParams.get('period') || '24h';
    
    if (period !== '24h' && period !== '7d') {
      throw new Error('Invalid period parameter. Must be "24h" or "7d"');
    }
    
    // Fetch BMRS historical data
    const rawData = await fetchBMRSHistoricalGeneration(period);
    
    // Fetch PV Live solar data for the appropriate time window
    const now = new Date();
    let startISO: string, endISO: string;
    
    if (period === '7d') {
      startISO = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago for buffer
      endISO = now.toISOString();
    } else {
      startISO = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(); // 26 hours ago for buffer
      endISO = now.toISOString();
    }
    
    const { data: pvLiveData, source: pvSource } = await fetchPVLiveNational(startISO, endISO, debug);
    
    // Process data with solar integration
    const processedData = await processHistoricalData(rawData, pvLiveData, pvSource, period, debug);
    
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
      ...(debug && {
        diagnostics: {
          pv: {
            totalRows: pvLiveData.length,
            samples: pvLiveData.slice(0, 3).map(row => ({ t: row.t, mw: row.mw })),
            source: pvSource,
            timeWindow: { startISO, endISO }
          }
        }
      })
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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