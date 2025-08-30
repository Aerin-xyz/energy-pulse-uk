const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
};

// BMRS base
const BMRS_BASE = "https://bmrs.elexon.co.uk/bmrs/api/v1";

// Strict result type for fetch attempts
type StrictResult =
  | { ok: true; data: any; url: string; status: number; contentType: string; variant: string }
  | { ok: false; url: string; status: number; reason: string; body?: string; contentType?: string; variant: string; redirectedTo?: string };

function withFormat(u: string): string {
  try { const url = new URL(u); url.searchParams.set("format","json"); return url.toString(); }
  catch { return u.includes("?") ? `${u}&format=json` : `${u}?format=json`; }
}

// Slightly more browser-like headers to reduce WAF/SPAs
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36";
const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": UA,
  Origin: "https://bmrs.elexon.co.uk",
  Referer: "https://bmrs.elexon.co.uk/",
  "Accept-Language": "en-GB,en;q=0.9",
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
  try { return { ok: true, data: JSON.parse(text), url, status: res.status, contentType: ct, variant }; }
  catch { return { ok: false, url, status: 200, reason: "json-parse-failed", body: text.slice(0, 200), contentType: ct, variant }; }
}

// Prefer SUMMARY (more stable) → CURRENT → DATASET (FUELHH stream)
async function fetchBMRS(path: string): Promise<StrictResult> {
  const variants: { v: string; url: string }[] = [
    { v: "insights-summary", url: withFormat(`${BMRS_BASE}${path.replace("/current","/summary")}`) },
    { v: "insights-current", url: withFormat(`${BMRS_BASE}${path}`) },
  ];
  if (path.startsWith("/generation/outturn")) {
    variants.push({ v: "dataset-fuelhh-stream", url: withFormat(`${BMRS_BASE}/datasets/FUELHH/stream?limit=200`) });
  }

  for (const { v, url } of variants) {
    const r = await tryOnce(url, v);
    if (r.ok) return r;
  }
  return { ok: false, url: variants[0].url, status: 502, reason: "all-variants-non-json", variant: "exhausted" };
}

// Small helpers
function asArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (Array.isArray(x.data)) return x.data;
  if (x.result?.records && Array.isArray(x.result.records)) return x.result.records;
  return [];
}

function num(...c: any[]): number | undefined {
  for (const v of c) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

// Colors for frontend charts
const COLORS: Record<string,string> = { Wind:"#10b981", Nuclear:"#f59e0b", Gas:"#ef4444", Coal:"#374151", Hydro:"#3b82f6", Solar:"#fbbf24", Biomass:"#16a34a", Oil:"#1f2937", Other:"#6b7280" };

function labelFuel(f: string): string {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Try BMRS (summary → current → dataset)
  const outturnR = await fetchBMRS("/generation/outturn/current");
  const icR      = await fetchBMRS("/generation/outturn/interconnectors");
  const demandR  = await fetchBMRS("/demand/outturn/summary");

  const bmrsAllOk = outturnR.ok && icR.ok && demandR.ok;

  // If any failed → LKG or stub
  if (!bmrsAllOk) {
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
        lkg.dataFreshness = {
          ...(lkg.dataFreshness || {}),
          isRealtime: false,
          note: "BMRS unavailable; served last-known-good",
          diagnostics: { outturn: outturnR, interconnectors: icR, demand: demandR }
        };
        return new Response(JSON.stringify(lkg), {
          headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" }
        });
      }
    } catch (e) {
      console.warn("LKG read failed:", e);
    }

    // No LKG yet → return a minimal stub (200, so UI never errors)
    const stub = {
      generationMix: [],
      interconnectors: [],
      totalGeneration: 0,
      totalDemand: 0,
      lastUpdated: new Date().toISOString(),
      dataFreshness: {
        source: "BMRS",
        isRealtime: false,
        note: "Stub payload: BMRS endpoints non-JSON on first run",
        diagnostics: { outturn: outturnR, interconnectors: icR, demand: demandR }
      }
    };
    return new Response(JSON.stringify(stub), {
      headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" }
    });
  }

  // ---------- Parse SUCCESS path below ----------

  // OUTTURN rows (summary may return many; pick latest SP)
  const outRows = asArray(outturnR.data);
  if (outRows.length === 0) {
    const stub = {
      generationMix: [],
      interconnectors: [],
      totalGeneration: 0,
      totalDemand: 0,
      lastUpdated: new Date().toISOString(),
      dataFreshness: { source: "BMRS", isRealtime: false, note: "Outturn rows empty after resolver" }
    };
    return new Response(JSON.stringify(stub), {
      headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" }
    });
  }
  outRows.sort((a,b) => new Date(a.spTo ?? a.toTime ?? a.timeTo ?? 0).getTime() - new Date(b.spTo ?? b.toTime ?? b.timeTo ?? 0).getTime());
  const latest = outRows[outRows.length - 1];
  const spFrom = latest.spFrom ?? latest.fromTime ?? latest.start ?? latest.timeFrom;
  const spTo   = latest.spTo   ?? latest.toTime   ?? latest.end   ?? latest.timeTo;

  // Build generation mix (exclude interconnectors + pumped)
  const EXCLUDE = new Set(["INTERCONNECTOR", "INTERCONNECTORS", "INTERCONNECTOR_EXPORT", "INTERCONNECTOR_IMPORT", "PUMPED_STORAGE", "PS", "INTFR", "INTIRL", "INTNED", "INTEW", "INTNEM", "INTELEC", "INTNSL"]);
  const mix: Record<string, number> = {};
  for (const r of outRows) {
    const fuel = String(r.fuelType ?? r.fuel ?? r.fuel_type ?? "").toUpperCase();
    const mw   = num(r.generation, r.mw, r.value) ?? 0;
    if (fuel.includes("PUMP") || fuel.includes("INTERCONNECT")) continue;
    const L = labelFuel(fuel);
    mix[L] = (mix[L] || 0) + mw;
  }

  const totalGenerationMW = Object.values(mix).reduce((s,v)=>s+v,0);
  const generationMix = Object.entries(mix)
    .map(([name, mw]) => ({
      name,
      value: Math.round(mw),
      percentage: totalGenerationMW ? Math.round((mw/totalGenerationMW)*100) : 0,
      color: COLORS[name] || "#6b7280"
    }))
    .sort((a,b)=>b.value-a.value);

  // INTERCONNECTORS
  const icRows = asArray(icR.data);
  const interconnectors = icRows.map((r: any) => ({
    name: r.interconnectorName ?? r.name ?? "Unknown",
    country: r.country ?? "",
    flow: num(r.flow, r.mw, r.value) ?? 0,       // + import / - export
    capacity: num(r.capacity, r.cap, r.maxCapacity)
  }));

  // DEMAND (national)
  const dRows = asArray(demandR.data);
  const national = dRows.find((r: any) => String(r.region ?? r.area ?? "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0] ?? {};
  const totalDemandMW = num(national.demand, national.mw, national.value) ?? 0;

  const payload = {
    generationMix,
    interconnectors,
    totalGeneration: Math.round((totalGenerationMW/1000)*100)/100,
    totalDemand:     Math.round((totalDemandMW/1000)*100)/100,
    lastUpdated: spTo ?? new Date().toISOString(),
    dataFreshness: { source: "BMRS", isRealtime: true, spFrom, spTo, variant: outturnR.variant }
  };

  // Upsert LKG only on real success (never write stubs)
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await supa.from("energy_data_history").insert({ as_of: payload.lastUpdated, payload });
  } catch (e) {
    console.warn("LKG insert failed:", e);
  }

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type":"application/json", "Cache-Control":"no-store" }
  });
});
