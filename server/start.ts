import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { accountHttp } from "./http";
import { database, initialize } from "./database";
const root = resolve("dist");
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL)
    throw Error("DATABASE_URL must point to durable Postgres storage");
  if (!process.env.APP_ORIGIN?.startsWith("https://"))
    throw Error("APP_ORIGIN must be your HTTPS application origin");
}
await initialize(await database());
const security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
};
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  for (const [key, value] of Object.entries(security))
    res.setHeader(key, value);
  if (req.url?.startsWith("/api/account")) return accountHttp(req, res);
  if (req.url === "/healthz") {
    try {
      await (await database()).query("SELECT 1");
      res.end("ok");
    } catch {
      res.statusCode = 503;
      res.end("Database unavailable");
    }
    return;
  }
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.statusCode = 405;
    res.end();
    return;
  }
  try {
    const path = decodeURIComponent(
      new URL(req.url || "/", "http://local").pathname,
    );
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!file.startsWith(root + "/")) throw Error();
    if (!(await stat(file)).isFile()) throw Error();
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      path.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    if (path === "/sw.js") res.setHeader("Service-Worker-Allowed", "/");
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(Number(process.env.PORT || 4173), "0.0.0.0", () =>
  console.log("Living World server is ready"),
);
