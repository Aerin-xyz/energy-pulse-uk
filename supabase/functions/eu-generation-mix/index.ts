import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  checkRateLimit, 
  getCachedResponse, 
  setCachedResponse, 
  getClientIP
} from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
function pad2(n: number) { 
  return n.toString().padStart(2, "0"); 
}

function toPeriod(d: Date) {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}`;
}

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

async function entsoeRawXML(token: string, qs: string) {
  const base = "https://web-api.tp.entsoe.eu/api";
  const url = `${base}?securityToken=${encodeURIComponent(token)}&${qs}`;
  const res = await fetch(url, { 
    headers: { "Accept": "application/xml" }, 
    redirect: "manual" as RequestRedirect, 
    cache: "no-store" 
  });
  const text = await res.text();
  const ctype = res.headers.get("content-type") || "";
  return { url, status: res.status, isXML: ctype.includes("xml"), text };
}

// Minimal A75 parser (XML → latest timestamp mix)
function parseA75Mix(xml: string) {
  const dom = new (globalThis as any).DOMParser().parseFromString(xml, "application/xml");
  if (!dom) return { ok: false, ts: null, byFuel: {} as Record<string, number> };

  // ack document? (HTTP 400 acknowledged)
  if (dom.getElementsByTagName("Acknowledgement_MarketDocument").length) {
    return { ok: false, ts: null, byFuel: {} };
  }

  // A75: multiple TimeSeries, each with psrType and Period/Point/quantity
  const series = Array.from(dom.getElementsByTagName("TimeSeries"));
  const recs: Array<{ fuel: string; t: string; mw: number }> = [];

  for (const ts of series) {
    const fuel = (ts as any).getElementsByTagName("psrType")[0]?.textContent || "OTHER";
    const period = (ts as any).getElementsByTagName("Period")[0];
    if (!period) continue;
    const ti = period.getElementsByTagName("timeInterval")[0];
    const startISO = ti?.getElementsByTagName("start")[0]?.textContent || "";
    const res = period.getElementsByTagName("resolution")[0]?.textContent || "PT60M";
    const stepMin = res === "PT15M" ? 15 : (res === "PT30M" ? 30 : 60);

    const points = Array.from(period.getElementsByTagName("Point"));
    for (const p of points) {
      const pos = Number((p as any).getElementsByTagName("position")[0]?.textContent || "0");
      const q = Number((p as any).getElementsByTagName("quantity")[0]?.textContent || "NaN");
      if (!startISO || !Number.isFinite(q) || pos <= 0) continue;
      const t0 = new Date(startISO).getTime();
      const t = new Date(t0 + (pos - 1) * stepMin * 60 * 1000).toISOString();
      recs.push({ fuel, t, mw: q });
    }
  }
  if (!recs.length) return { ok: false, ts: null, byFuel: {} };

  const latestT = recs.map(r => r.t).sort().pop()!;
  const latest = recs.filter(r => r.t === latestT);
  const byFuel: Record<string, number> = {};
  for (const r of latest) byFuel[r.fuel] = (byFuel[r.fuel] || 0) + r.mw;

  return { ok: true, ts: latestT, byFuel };
}

// EU zones configuration
const EU_ZONES = [
  { code: "GB", eic: "10YGB----------A" },
  { code: "FR", eic: "10YFR-RTE------C" },
  { code: "BE", eic: "10YBE----------2" },
  { code: "NL", eic: "10YNL----------L" },
  { code: "IE", eic: "10YIE-1001A00010" }, // SEM
];

async function fetchCountryA75(token: string, eic: string, now = new Date()) {
  // Small retry plan: 15 → 30 → 60 minute windows
  const plans = [
    { mtu: 15, windowMin: 60 },
    { mtu: 30, windowMin: 120 },
    { mtu: 60, windowMin: 180 },
  ];
  const tries: any[] = [];

  for (const p of plans) {
    const start = alignDown(addMinutes(now, -p.windowMin), p.mtu);
    const end = alignDown(now, p.mtu);

    // IMPORTANT: A75 + in_Domain (lowercase i!)
    const qs = `documentType=A75&processType=A16&in_Domain=${eic}&periodStart=${toPeriod(start)}&periodEnd=${toPeriod(end)}`;

    const r = await entsoeRawXML(token, qs);
    const ack = r.text.includes("Acknowledgement_MarketDocument");
    tries.push({ url: r.url, status: r.status, isXML: r.isXML, ack, mtu: p.mtu, window: p.windowMin });

    if (!r.isXML) continue;
    if (r.status === 400 && ack) continue; // try next plan

    const parsed = parseA75Mix(r.text);
    if (parsed.ok) return { ok: true, ts: parsed.ts, byFuel: parsed.byFuel, tries };
  }
  return { ok: false, ts: null, byFuel: {}, tries };
}

async function fetchEUGenerationMix(DEBUG = false) {
  const token =
    Deno.env.get("ENTSOE_TOKEN") ||
    Deno.env.get("ENTSOE_API_TOKEN") ||
    Deno.env.get("ENTSOE_KEY") || "";

  const tokenPresent = !!token;
  if (DEBUG) console.log("[EU] token present:", tokenPresent ? "yes" : "no");

  if (!tokenPresent) {
    return { ok: false, countries: [], diagnostics: { tokenPresent: false } };
  }

  const now = new Date();
  const results = await Promise.all(EU_ZONES.map(z => fetchCountryA75(token, z.eic, now)));
  const countries = EU_ZONES.map((z, i) => ({
    code: z.code,
    ts: results[i].ts,
    mixByFuel: results[i].byFuel,
    ok: results[i].ok,
  }));

  if (DEBUG) {
    console.log("[EU] success:", countries.filter(c => c.ok).map(c => c.code));
  }

  return {
    ok: countries.some(c => c.ok),
    countries,
    diagnostics: DEBUG ? {
      tokenPresent: true,
      attempts: results.map((r, i) => ({ code: EU_ZONES[i].code, tries: r.tries.slice(0, 3) }))
    } : undefined
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  // Debug mode is now disabled for unauthenticated requests (security improvement)
  const DEBUG = false;

  // Rate limiting (10 req/min, 30 req/hour)
  const rateLimitResult = await checkRateLimit('eu-generation-mix', clientIP, {
    requestsPerMinute: 10,
    requestsPerHour: 30,
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

  // Response caching (4 minutes TTL)
  const cacheTTL = 240;
  const cacheKey = 'cache:eu-generation-mix';
  
  const cachedResponse = await getCachedResponse(cacheKey);
  if (cachedResponse.hit && cachedResponse.data) {
    return new Response(cachedResponse.data, {
      headers: {
        ...corsHeaders,
        ...rateLimitResult.headers,
        'Content-Type': 'application/json',
        'X-Cache-Status': 'HIT',
        'X-Cache-TTL': cachedResponse.ttl.toString(),
      },
    });
  }

  try {
    console.log("[eu-generation-mix] Starting EU Generation Mix fetch");
    
    const EU = await fetchEUGenerationMix(DEBUG);
    
    const payload = {
      euGenerationMix: EU.countries,
      ok: EU.ok,
      lastUpdated: new Date().toISOString(),
      diagnostics: DEBUG ? EU.diagnostics : undefined
    };

    if (DEBUG) {
      console.log("[eu-generation-mix] EU Generation Mix result:", {
        success: EU.ok,
        countries: EU.countries.length,
        validCountries: EU.countries.filter(c => c.ok).length
      });
    }

    // Cache the response
    const responseBody = JSON.stringify(payload);
    await setCachedResponse(cacheKey, responseBody, cacheTTL);

    return new Response(responseBody, {
      headers: { 
        ...corsHeaders, 
        ...rateLimitResult.headers,
        'Content-Type': 'application/json',
        'X-Cache-Status': 'MISS',
        'X-Cache-TTL': cacheTTL.toString(),
      },
    });

  } catch (error) {
    console.error('[eu-generation-mix] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      euGenerationMix: [],
      ok: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});