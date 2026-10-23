// Disabled by the 23 October 2026 access-control remediation.
// Legacy workflows had no authorised caller boundary. Do not restore without
// an explicit administrator/service identity check and outbound approval controls.
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  return new Response(JSON.stringify({ error: 'Legacy workflow disabled' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
