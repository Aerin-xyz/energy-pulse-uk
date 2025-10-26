// ENTSO-E health check and diagnostics
// Verifies token presence and performs a lightweight A11 physical flows request
// to surface HTTP status and common XML error messages.

import { 
  checkRateLimit, 
  getCachedResponse, 
  setCachedResponse, 
  getClientIP,
  validateOptionalEICDomain,
  validateOptionalEntsoeTimestamp,
  validateOptionalInteger,
  validateBoolean,
  ValidationError
} from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function xmlExtract(text: string, tag: string): string | undefined {
  const m = text.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`, 'i'));
  return m?.[1]?.trim();
}

function parseEntsoeError(xml: string): { errorType?: string; message?: string; code?: string } | undefined {
  // ENTSO-E often wraps errors in an Acknowledgement_MarketDocument or in Reason/Code tags
  const ack = /<Acknowledgement[_-]?MarketDocument/i.test(xml);
  const reasonText = xmlExtract(xml, 'text') || xmlExtract(xml, 'ReasonText');
  const reasonCode = xmlExtract(xml, 'code') || xmlExtract(xml, 'ReasonCode');
  if (ack || reasonText || reasonCode) {
    return {
      errorType: ack ? 'acknowledgement' : 'reason',
      message: reasonText,
      code: reasonCode,
    };
  }
  // Some responses contain generic <message>
  const msg = xmlExtract(xml, 'message');
  if (msg) return { errorType: 'message', message: msg };
  return undefined;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);

  // Rate limiting (3 req/min, 10 req/hour)
  const rateLimitResult = await checkRateLimit('entsoe-health', clientIP, {
    requestsPerMinute: 30,
    requestsPerHour: 200,
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
    const urlObj = new URL(req.url);
    const qp = (k: string, d?: string) => urlObj.searchParams.get(k) ?? d;

    const token = Deno.env.get('ENTSOE_API_TOKEN');
    if (!token) {
      const body = { ok: false, tokenPresent: false, reason: 'no-api-token' };
      return new Response(JSON.stringify(body), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Input validation and parameter handling
    let inDomain: string;
    let outDomain: string;
    let periodStart: string;
    let periodEnd: string;

    const formatEntsoe = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}` +
      `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;

    try {
      if (req.method === 'POST') {
        const body = await req.json();
        
        // Validate EIC domains
        inDomain = body.in_Domain || qp('in_Domain', '10YGB----------A');
        outDomain = body.out_Domain || qp('out_Domain', '10YFR-RTE------C');
        
        // Validate minutesBack (15-1440 minutes = 15min to 24 hours)
        const minutesBack = validateOptionalInteger(body.minutesBack, 15, 1440, 'minutesBack') || 120;
        const alignQuarter = validateBoolean(body.alignQuarter, 'alignQuarter');
        const alignHour = validateBoolean(body.alignHour, 'alignHour');
        
        const now = new Date();
        let endTime = new Date(now.getTime() - minutesBack * 60 * 1000);
        let startTime = new Date(endTime.getTime() - 15 * 60 * 1000); // default: 15 minute window
        
        if (alignHour) {
          // Align to hour boundaries and use 60-minute window
          endTime.setUTCMinutes(0, 0, 0);
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
        } else if (alignQuarter) {
          // Align to quarter-hour boundaries
          endTime.setUTCMinutes(Math.floor(endTime.getUTCMinutes() / 15) * 15, 0, 0);
          startTime = new Date(endTime.getTime() - 15 * 60 * 1000);
        }
        
        periodStart = formatEntsoe(startTime);
        periodEnd = formatEntsoe(endTime);
      } else {
        // GET request - use query parameters with validation
        inDomain = qp('in_Domain', '10YGB----------A');
        outDomain = qp('out_Domain', '10YFR-RTE------C');
        
        const now = new Date();
        const alignHourQP = validateBoolean(qp('alignHour', ''), 'alignHour');
        
        if (alignHourQP) {
          const endTime = new Date(now);
          endTime.setUTCMinutes(0, 0, 0);
          const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          periodStart = formatEntsoe(startTime);
          periodEnd = formatEntsoe(endTime);
        } else {
          const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
          periodStart = validateOptionalEntsoeTimestamp(qp('periodStart'), 'periodStart') || formatEntsoe(start);
          periodEnd = validateOptionalEntsoeTimestamp(qp('periodEnd'), 'periodEnd') || formatEntsoe(now);
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message, ok: false }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    const entsoeUrl = `https://web-api.tp.entsoe.eu/api?` +
      `securityToken=${token}&` +
      `documentType=A11&` +
      `in_Domain=${inDomain}&` +
      `out_Domain=${outDomain}&` +
      `periodStart=${periodStart}&` +
      `periodEnd=${periodEnd}`;

    let status = 0; let contentType = ''; let xmlPreview = ''; let parsedErr: any = undefined;

    try {
      const res = await fetch(entsoeUrl, { headers: { Accept: 'application/xml, text/xml' }, signal: AbortSignal.timeout(12000) });
      status = res.status;
      contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      xmlPreview = text.slice(0, 500);
      parsedErr = parseEntsoeError(text);

      // Heuristic: if XML contains quantities, we likely succeeded
      const hasQuantity = /<quantity>(-?\d+(?:\.\d+)?)<\/quantity>/i.test(text);
      const ok = res.ok && hasQuantity;

      const body = {
        ok,
        tokenPresent: true,
        attempt: {
          url: entsoeUrl,
          status,
          contentType,
          xmlPreview,
          parsedErr,
        },
      };

      return new Response(JSON.stringify(body), { 
        headers: { 
          ...corsHeaders, 
          ...rateLimitResult.headers,
          'Content-Type': 'application/json' 
        } 
      });
    } catch (e) {
      const body = {
        ok: false,
        tokenPresent: true,
        reason: 'fetch-error',
        error: (e as Error)?.message,
        attempt: {
          url: entsoeUrl,
          status,
          contentType,
          xmlPreview,
          parsedErr,
        },
      };
      return new Response(JSON.stringify(body), { 
        status: 502, 
        headers: { 
          ...corsHeaders, 
          ...rateLimitResult.headers,
          'Content-Type': 'application/json' 
        } 
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, reason: 'internal-error', error: (err as Error)?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
