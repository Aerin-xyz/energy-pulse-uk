import { serve } from "https://deno.land/std@0.224.0/http/server.ts";




// ---------- CORS ----------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};




// ---------- Constants ----------
const BMRS = "https://bmrs.elexon.co.uk/bmrs/api/v1";




// helper: add ?format=json on 406 and broaden Accept
async function getJSON(url: string) {
  const h1 = { Accept: "application/json", "User-Agent": "ether-flow/1.0" };
  let res = await fetch(url, { headers: h1, cache: "no-store" });
  if (res.status === 406) {
    const u = new URL(url);
    if (!u.searchParams.has("format")) u.searchParams.set("format", "json");
    const h2 = { ...h1, Accept: "application/json, text/plain, */*" };
    res = await fetch(u.toString(), { headers: h2, cache: "no-store" });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BMRS ${res.status} ${url} :: ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text as any; }
}




// Map to your UI colors
const ENERGY_COLORS: Record<string,string> = {
  Wind:"#10b981", Nuclear:"#f59e0b", Gas:"#ef4444", Coal:"#374151",
  Hydro:"#3b82f6", Solar:"#fbbf24", Biomass:"#16a34a", Oil:"#1f2937",
  Other:"#6b7280"
};




// Exclude interconnectors & pumped when making the generation mix bars
const EXCLUDE_FROM_MIX = new Set(["INTERCONNECTOR","INTERCONNECTORS","INTERCONNECTOR_EXPORT",
  "INTERCONNECTOR_IMPORT","PUMPED_STORAGE","PS","INTFR","INTIRL","INTNED","INTEW","INTNEM","INTELEC","INTNSL"]);




// Normalize BMRS fuel label → UI label
function normalizeFuel(f: string): string {
  const t = f.toUpperCase();
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




serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });




  try {
    // A) Anchor SP and fuel MWs
    const outturn = await getJSON(`${BMRS}/generation/outturn/current`);
    // shape: { data: [{ fuelType, generation, spFrom, spTo, ...}, ...] } (varies; we tolerate keys)
    const rows: any[] = outturn?.data ?? outturn ?? [];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("No BMRS outturn rows");




    // Derive SP window from the first row (they all share the same)
    const spFrom = rows[0].spFrom ?? rows[0].fromTime ?? rows[0].start ?? rows[0].timeFrom;
    const spTo   = rows[0].spTo   ?? rows[0].toTime   ?? rows[0].end   ?? rows[0].timeTo;




    // Split: fuel mix components vs pumped & interconnectors
    let hvWindMW = 0, hvSolarMW = 0, pumpedMW = 0;
    const mixTally: Record<string, number> = {};




    for (const r of rows) {
      const fuel = String(r.fuelType ?? r.fuel ?? "").toUpperCase();
      const mw   = Number(r.generation ?? r.mw ?? r.value ?? 0);




      if (fuel.includes("PUMP")) { pumpedMW += mw; continue; }
      if (fuel.includes("INTERCONNECT")) { /* IC excluded from mix here */ continue; }




      // For HV wind/solar extraction:
      if (fuel.includes("WIND")) hvWindMW += mw;
      if (fuel.includes("SOLAR")) hvSolarMW += mw;




      // Only include non-IC, non-pumped in the generation mix bars
      if (!EXCLUDE_FROM_MIX.has(fuel)) {
        const label = normalizeFuel(fuel);
        mixTally[label] = (mixTally[label] || 0) + mw;
      }
    }




    // B) Interconnectors (sum imports/exports)
    const ic = await getJSON(`${BMRS}/generation/outturn/interconnectors`);
    const icRows: any[] = ic?.data ?? ic ?? [];
    const interconnectors = icRows.map(r => {
      const name = r.interconnectorName ?? r.name ?? "Unknown";
      const flow = Number(r.flow ?? r.mw ?? 0); // +ve import, -ve export in Insights
      const capacity = Number(r.capacity ?? 0) || undefined;
      return { name, country: r.country ?? "", flow, capacity };
    });




    // C) Demand outturn (national)
    const demand = await getJSON(`${BMRS}/demand/outturn/summary`);
    const dRows: any[] = demand?.data ?? demand ?? [];
    const national = dRows.find(r => (r.region ?? r.area ?? "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0];
    const totalDemandGW = Number(national?.demand ?? national?.mw ?? 0) / 1000;




    // D) Build generation mix array for UI
    const totalGenerationMW = Object.values(mixTally).reduce((s,v)=>s+v,0);
    const generationMix = Object.entries(mixTally)
      .map(([name, mw]) => ({
        name,
        value: Math.round(mw),                        // MW
        percentage: totalGenerationMW ? Math.round((mw/totalGenerationMW)*100) : 0,
        color: ENERGY_COLORS[name] || "#6b7280"
      }))
      .sort((a,b)=>b.value-a.value);




    // E) Total generation/demand (GW for your totals)
    const totalGenerationGW = totalGenerationMW / 1000;




    const response = {
      generationMix,                             // now pure HV/non-IC/non-pumped MW bars
      interconnectors,                           // live IC flows (± MW)
      totalGeneration: Math.round(totalGenerationGW * 100) / 100, // GW
      totalDemand: Math.round(totalDemandGW * 100) / 100,         // GW
      lastUpdated: spTo ?? new Date().toISOString(),              // settlement period end timestamp
      dataFreshness: {
        source: "BMRS",
        spFrom, spTo,
      }
    };




    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });




  } catch (err: any) {
    console.error("energy-data error:", err?.message || err);
    return new Response(JSON.stringify({ error: "Failed to fetch energy data", details: String(err?.message || err) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});