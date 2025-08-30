const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
};

type StrictResult =
  | { ok: true; data: any; url: string; status: number; contentType: string; variant: string }
  | { ok: false; url: string; status: number; reason: string; body?: string; contentType?: string; variant: string; redirectedTo?: string };

function withFormat(u: string): string {
  try { 
    const url = new URL(u); 
    url.searchParams.set("format","json"); 
    return url.toString(); 
  }
  catch { 
    return u.includes("?") ? `${u}&format=json` : `${u}?format=json`; 
  }
}

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": UA,
  Origin: "https://bmrs.elexon.co.uk",
  Referer: "https://bmrs.elexon.co.uk/",
} as Record<string,string>;

async function tryOnce(url: string, variant: string): Promise<StrictResult> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", redirect: "manual" as RequestRedirect });
  const ct  = res.headers.get("content-type") || "";
  const text = await res.text();

  if (res.status >= 300 && res.status < 400) {
    return { ok: false, url, status: res.status, reason: "redirect", body: text.slice(0, 300), contentType: ct, variant, redirectedTo: res.headers.get("location") || "" };
  }
  if (!ct.toLowerCase().includes("json")) {
    return { ok: false, url, status: res.status, reason: "non-json", body: text.slice(0, 300), contentType: ct, variant };
  }
  if (!res.ok) {
    return { ok: false, url, status: res.status, reason: "http-error", body: text.slice(0, 300), contentType: ct, variant };
  }
  try { 
    return { ok: true, data: JSON.parse(text), url, status: res.status, contentType: ct, variant }; 
  }
  catch { 
    return { ok: false, url, status: 200, reason: "json-parse-failed", body: text.slice(0, 200), contentType: ct, variant }; 
  }
}

async function fetchBMRS(path: string): Promise<StrictResult> {
  // Prefer SUMMARY (stable) → CURRENT → DATASET
  const variants: { v: string; url: string }[] = [
    { v: "insights-summary", url: withFormat(`https://bmrs.elexon.co.uk/bmrs/api/v1${path.replace("/current","/summary")}`) },
    { v: "insights-current", url: withFormat(`https://bmrs.elexon.co.uk/bmrs/api/v1${path}`) },
  ];
  if (path.startsWith("/generation/outturn")) {
    variants.push({ v: "dataset-fuelhh-stream", url: withFormat(`https://bmrs.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?limit=200`) });
  }

  for (const { v, url } of variants) {
    const r = await tryOnce(url, v);
    if (r.ok) return r;
  }
  return { ok: false, url: variants[0].url, status: 502, reason: "all-variants-non-json", variant: "exhausted" };
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

async function getLKG() {
  try {
    const supa = (await import("https://esm.sh/@supabase/supabase-js@2")).createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: lkg } = await supa
      .from("energy_data_history")
      .select("payload")
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();
    return lkg?.payload;
  } catch (e) {
    console.warn("LKG fetch failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching energy data from BMRS API...');

    // A) OUTTURN (summary preferred)
    const outturnR = await fetchBMRS("/generation/outturn/current");
    if (!outturnR.ok) {
      console.log('BMRS outturn failed, trying LKG...', outturnR);
      const lkg = await getLKG();
      if (lkg) {
        return new Response(JSON.stringify({ 
          ...lkg, 
          meta: { isRealtime: false, note: "BMRS failed", detail: outturnR } 
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: "bmrs_outturn_failed", detail: outturnR }), {
        status: 502, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const outRows = asArray(outturnR.data);
    if (outRows.length === 0) {
      return new Response(JSON.stringify({ 
        error: "bmrs_outturn_empty_after_resolver", 
        variant: outturnR.variant, 
        sample: outturnR.data 
      }), {
        status: 502, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // If summary, pick latest SP
    outRows.sort((a,b) => new Date(a.spTo ?? a.toTime ?? a.timeTo ?? 0).getTime() - new Date(b.spTo ?? b.toTime ?? b.timeTo ?? 0).getTime());
    const latestSP = outRows[outRows.length - 1];

    // B) INTERCONNECTORS
    const icR = await fetchBMRS("/generation/outturn/interconnectors");
    if (!icR.ok) {
      console.log('BMRS interconnectors failed, trying LKG...', icR);
      const lkg = await getLKG();
      if (lkg) {
        return new Response(JSON.stringify({ 
          ...lkg, 
          meta: { isRealtime: false, note: "BMRS IC failed", detail: icR } 
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: "bmrs_interconnectors_failed", detail: icR }), {
        status: 502, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const icRows = asArray(icR.data);

    // C) DEMAND
    const demandR = await fetchBMRS("/demand/outturn/summary");
    if (!demandR.ok) {
      console.log('BMRS demand failed, trying LKG...', demandR);
      const lkg = await getLKG();
      if (lkg) {
        return new Response(JSON.stringify({ 
          ...lkg, 
          meta: { isRealtime: false, note: "BMRS demand failed", detail: demandR } 
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({ error: "bmrs_demand_summary_failed", detail: demandR }), {
        status: 502, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const dRows = asArray(demandR.data);

    // Process data as before...
    const spFrom = latestSP.spFrom ?? latestSP.fromTime ?? latestSP.start ?? latestSP.timeFrom;
    const spTo = latestSP.spTo ?? latestSP.toTime ?? latestSP.end ?? latestSP.timeTo;

    // Build generation mix (exclude IC & pumped)
    let totalGenerationMW = 0;
    const mixTally: Record<string, number> = {};
    
    for (const r of outRows) {
      const fuel = String(r.fuelType ?? r.fuel ?? r.fuel_type ?? "").toUpperCase();
      const mw = numberish(r.generation, r.mw, r.value) ?? 0;
      
      if (!EXCLUDE_FROM_MIX.has(fuel) && mw > 0) {
        const norm = normalizeFuel(fuel);
        mixTally[norm] = (mixTally[norm] || 0) + mw;
        totalGenerationMW += mw;
      }
    }

    const generationMix = Object.entries(mixTally).map(([name, value]) => ({
      name,
      value: Math.round(value),
      percentage: Math.round((value / totalGenerationMW) * 100),
      color: ENERGY_COLORS[name] || ENERGY_COLORS.Other
    })).sort((a, b) => b.value - a.value);

    // Process interconnectors
    const interconnectors = icRows.map((ic: any) => ({
      name: ic.interconnectorName ?? ic.name ?? "Unknown",
      country: ic.country ?? "Unknown",
      flow: Math.round(numberish(ic.flow, ic.value, ic.generation) ?? 0),
      capacity: Math.round(numberish(ic.capacity, ic.maxCapacity) ?? 0)
    }));

    // Get total demand
    const totalDemandMW = dRows.reduce((sum: number, d: any) => {
      return sum + (numberish(d.demand, d.value, d.generation) ?? 0);
    }, 0);

    const payload = {
      generationMix,
      interconnectors,
      totalGeneration: Math.round((totalGenerationMW/1000)*100)/100,
      totalDemand: Math.round((totalDemandMW/1000)*100)/100,
      lastUpdated: spTo ?? new Date().toISOString(),
      dataFreshness: { source: "BMRS", spFrom, spTo, variant: outturnR.variant }
    };

    // Upsert LKG (best-effort)
    try {
      const supa = (await import("https://esm.sh/@supabase/supabase-js@2")).createClient(
        Deno.env.get("SUPABASE_URL") ?? "", 
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supa.from("energy_data_history").insert({ 
        as_of: payload.lastUpdated, 
        payload 
      });
    } catch (e) { 
      console.warn("LKG insert failed", e); 
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" }
    });

  } catch (error) {
    console.error('Error in energy-data function:', error);
    
    // Try LKG on unexpected errors too
    const lkg = await getLKG();
    if (lkg) {
      return new Response(JSON.stringify({ 
        ...lkg, 
        meta: { isRealtime: false, note: "Unexpected error", error: error.message } 
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ 
      error: "internal_error", 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
