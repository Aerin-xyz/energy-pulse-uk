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

async function fetchBMRSHistoricalGeneration(): Promise<any> {
  const hosts = ["data.elexon.co.uk", "bmrs.elexon.co.uk"];
  
  // Get 48 settlement periods (24 hours) ending now
  const now = new Date();
  const toDate = now.toISOString().split('T')[0];
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
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

function processHistoricalData(rawData: any): any[] {
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
  
  console.log(`Processing ${dataArray.length} historical data periods`);
  
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
      totalMW: 0
    };
    
    // Process fuel data - each item.data array contains the complete fuel mix for this settlement period
    if (item.data && Array.isArray(item.data)) {
      for (const fuelData of item.data) {
        const mappedFuel = FUEL_TYPE_MAPPING[fuelData.fuelType] || 'Other';
        
        if (!period.fuelMix[mappedFuel]) {
          period.fuelMix[mappedFuel] = 0;
        }
        
        period.fuelMix[mappedFuel] += fuelData.generation || 0;
        period.totalMW += fuelData.generation || 0;
      }
      
      // Validation: Check if total is within realistic range (15-50 GW for UK)
      if (period.totalMW < 15000 || period.totalMW > 50000) {
        console.warn(`Settlement period ${key} has unrealistic total: ${period.totalMW} MW`);
      }
      
      console.log(`Settlement period ${key}: ${period.totalMW} MW total, ${Object.keys(period.fuelMix).length} fuel types`);
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
  
  console.log(`Processed ${result.length} settlement periods`);
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
    
    const rawData = await fetchBMRSHistoricalGeneration();
    const processedData = processHistoricalData(rawData);
    
    const response = {
      data: processedData,
      lastUpdated: new Date().toISOString(),
      totalPeriods: processedData.length
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