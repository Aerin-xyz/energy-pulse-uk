// Cloudflare Pages: unknown dated reports must be real HTTP 404s, not SPA fallbacks.
export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
  env: { ASSETS: { fetch: (request: Request) => Promise<Response> } };
}) {
  const url = new URL(context.request.url);
  const manifest = await context.env.ASSETS.fetch(
    new Request(new URL("/route-manifest.json", url)),
  );
  if (!manifest.ok)
    return new Response("Archive index temporarily unavailable", {
      status: 503,
    });
  const routes = (await manifest.json()) as string[];
  const pathname = url.pathname.replace(/\/$/, "");
  if (!routes.includes(pathname)) {
    const page = await context.env.ASSETS.fetch(
      new Request(new URL("/404.html", url)),
    );
    return new Response(await page.text(), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }
  return context.next();
}
