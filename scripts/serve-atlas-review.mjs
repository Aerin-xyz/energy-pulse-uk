// Local-only production build preview. API requests remain read-only and cached for repeatable review.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(process.env.REVIEW_DIST || "dist"),
  port = Number(process.env.REVIEW_PORT || 4175);
const cache = new Map();
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost"),
        p = decodeURIComponent(u.pathname);
      if (p.startsWith("/api/")) {
        const key = p;
        let item = cache.get(key);
        if (!item) {
          const r = await fetch("https://energymix.info" + p, {
            signal: AbortSignal.timeout(20000),
          });
          item = {
            status: r.status,
            body: Buffer.from(await r.arrayBuffer()),
            type: r.headers.get("content-type"),
          };
          if (r.ok) cache.set(key, item);
        }
        res.writeHead(item.status, {
          "Content-Type": item.type || "application/json",
          "Cache-Control": "no-store",
        });
        res.end(item.body);
        return;
      }
      let file = path.resolve(root, "." + p);
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory())
        file = path.join(file, "index.html");
      if (!fs.existsSync(file)) file = path.join(root, "index.html");
      const body = fs.readFileSync(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      if (res.headersSent) {res.end();return;}
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end('{"error":"Review upstream unavailable"}');
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("Local review: http://127.0.0.1:" + port),
  );
