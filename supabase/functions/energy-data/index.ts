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
    if (row && row[k] !== undefined && row[k] !== null) {
      const n = Number(row[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function pickStr(row: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === 'string' && v.trim().length) return v;
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

  const urlDebug = new URL(req.url).searchParams.get("debug") === "1";
  function dlog(...args: any[]) { if (urlDebug) console.log("[energy-data DEBUG]", ...args); }

  // Try BMRS (summary → current → dataset)
  const outturnR = await fetchBMRS("/generation/outturn/current");
  dlog("outturn fetch:", { variant: (outturnR as any).variant, ok: (outturnR as any).ok, status: (outturnR as any).status });
  const icR      = await fetchBMRS("/generation/outturn/interconnectors");
  dlog("interconnectors fetch:", { variant: (icR as any).variant, ok: (icR as any).ok, status: (icR as any).status });
  const demandR  = await fetchBMRS("/demand/outturn/summary");
  dlog("demand fetch:", { variant: (demandR as any).variant, ok: (demandR as any).ok, status: (demandR as any).status });

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

  // OUTTURN rows (summary may return many; pick latest settlement window)
  const outRows = asArray(outturnR.data);
  dlog("outturn variant:", (outturnR as any).variant, "rows:", outRows.length, "sample:", outRows[0]);
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

  outRows.sort((a,b) => new Date(pickStr(a, ["spTo","toTime","timeTo","periodEnd","validTo"]) || 0).getTime() - new Date(pickStr(b, ["spTo","toTime","timeTo","periodEnd","validTo"]) || 0).getTime());
  const toMax = pickStr(outRows[outRows.length-1], ["spTo","toTime","timeTo","periodEnd","validTo"]);
  const latestRows = outRows.filter(r => {
    const toA = pickStr(r, ["spTo","toTime","timeTo","periodEnd","validTo"]);
    return (toA || "") === (toMax || "");
  });

  // Build fuel mix (exclude interconnectors & pumped)
  const EXCLUDE = /INTERCONNECT|INT[A-Z]*|PUMP|PUMPED|^PS$/i;
  function labelFuel(f: string): string {
    const t = f.toUpperCase();
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

  const mixMW: Record<string, number> = {};
  for (const r of latestRows) {
    const fuelRaw = pickStr(r, ["fuelType","fuel","fuel_type","FUELTYPE","name"]) || "";
    if (EXCLUDE.test(fuelRaw)) continue;
    const mw = pickNum(r, ["generation","generationMW","mw","value","actual","power","powerMW","measuredMW"]) ?? 0;
    const L = labelFuel(fuelRaw);
    mixMW[L] = (mixMW[L] || 0) + mw;
  }

  const totalGenerationMW = Object.values(mixMW).reduce((s,v)=>s+v,0);
  const generationMix = Object.entries(mixMW)
    .map(([name, mw]) => ({
      name,
      value: Math.round(mw as number),
      percentage: totalGenerationMW ? Math.round(((mw as number)/totalGenerationMW)*100) : 0,
      color: COLORS[name] || "#6b7280"
    }))
    .sort((a,b)=>b.value-a.value);

  const spFrom = pickStr(latestRows[0], ["spFrom","fromTime","timeFrom","periodStart","validFrom"]) || null;
  const spTo   = pickStr(latestRows[0], ["spTo","toTime","timeTo","periodEnd","validTo"]) || null;
  dlog("mixMW total(MW):", totalGenerationMW, "spFrom:", spFrom, "spTo:", spTo);

  // INTERCONNECTORS
  const icRows = asArray(icR.data);
  const interconnectors = icRows.map((r: any) => ({
    name: pickStr(r, ["interconnectorName","name","connector","id"]) || "Unknown",
    country: pickStr(r, ["country","counterparty","partner"]) || "",
    flow: pickNum(r, ["flow","flowMW","mw","value","ieFlow","actualFlowMW"]) ?? 0,       // + import / - export
    capacity: pickNum(r, ["capacity","cap","maxCapacity","capacityMW"]) 
  }));

  // DEMAND (national)
  const dRows = asArray(demandR.data);
  const national = dRows.find((r:any) => String(pickStr(r, ["region","area","name"]) || "NATIONAL").toUpperCase().includes("NATIONAL")) ?? dRows[0] ?? {};
  const totalDemandMW = pickNum(national, ["demand","demandMW","mw","value","totalDemandMW"]) ?? 0;

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
