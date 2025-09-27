// ENTSO-E health check and diagnostics
// Verifies token presence and performs a lightweight A11 physical flows request
// to surface HTTP status and common XML error messages.

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

  try {
    const urlObj = new URL(req.url);
    const qp = (k: string, d?: string) => urlObj.searchParams.get(k) ?? d;

    const token = Deno.env.get('ENTSOE_API_TOKEN');
    if (!token) {
      const body = { ok: false, tokenPresent: false, reason: 'no-api-token' };
      return new Response(JSON.stringify(body), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if we have a JSON body with border-specific parameters
    let inDomain = qp('in_Domain', '10YGB----------A');
    let outDomain = qp('out_Domain', '10YFR-RTE------C');
    let periodStart: string;
    let periodEnd: string;

    const formatEntsoe = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}` +
      `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.in_Domain) inDomain = body.in_Domain;
        if (body.out_Domain) outDomain = body.out_Domain;
        
        const minutesBack = body.minutesBack || 120; // Default 2 hours
        const alignQuarter = body.alignQuarter || false;
        const alignHour = body.alignHour || false;
        
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
      } catch {
        // Fall back to query parameters
        const now = new Date();
        const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        periodStart = qp('periodStart') || formatEntsoe(start);
        periodEnd = qp('periodEnd') || formatEntsoe(now);
      }
    } else {
      // GET request - use query parameters
      const now = new Date();
      const alignHourQP = qp('alignHour', '');
      if (alignHourQP === '1' || alignHourQP === 'true') {
        const endTime = new Date(now);
        endTime.setUTCMinutes(0, 0, 0);
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
        periodStart = formatEntsoe(startTime);
        periodEnd = formatEntsoe(endTime);
      } else {
        const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        periodStart = qp('periodStart') || formatEntsoe(start);
        periodEnd = qp('periodEnd') || formatEntsoe(now);
      }
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

      return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify(body), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, reason: 'internal-error', error: (err as Error)?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
