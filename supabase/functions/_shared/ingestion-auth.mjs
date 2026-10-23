// Dedicated scheduler credential; never accept a public API key or mere login.
export async function authorizeIngestion(req, expected) {
  if (typeof expected !== 'string' || expected.length < 32) {
    return new Response(JSON.stringify({ error: 'Scheduler authentication unavailable' }), { status: 503 });
  }
  const supplied = req.headers.get('authorization') || '';
  if (!supplied.startsWith('Bearer ') || supplied.length > 1024) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied.slice(7))),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const actual = new Uint8Array(actualHash);
  const wanted = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let i = 0; i < wanted.length; i++) mismatch |= actual[i] ^ wanted[i];
  if (mismatch !== 0) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  return null;
}
