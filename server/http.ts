import type { IncomingMessage, ServerResponse } from "node:http";
import { database, initialize, type Database } from "./database";
import { accountService } from "./accounts";
import { accountsEnabled } from "./features";
let connection: Promise<Database> | undefined;
export async function accountHttp(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Cookie");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!accountsEnabled()) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Accounts are disabled" }));
    return;
  }
  try {
    const secure =
      Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
    const origin =
      process.env.APP_ORIGIN ||
      (!secure
        ? "http://127.0.0.1:5173"
        : process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "");
    if (!origin) throw Error("APP_ORIGIN is required");
    connection ??= database().catch((e) => {
      connection = undefined;
      throw e;
    });
    const db = await connection;
    if (!secure) await initialize(db);
    let body: unknown;
    if (req.method === "POST") {
      if (!req.headers["content-type"]?.startsWith("application/json")) {
        res.statusCode = 415;
        res.end(JSON.stringify({ error: "Use application/json" }));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 5 * 1024 * 1024) {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: "Request is too large" }));
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
    }
    const action =
      new URL(req.url || "/", origin).searchParams.get("action") || "session";
    const result = await accountService(db, { origin, secure })({
      method: req.method || "GET",
      action,
      origin: req.headers.origin,
      cookie: req.headers.cookie,
      body,
      ip: process.env.RENDER
        ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress)
            .split(",")
            .at(-1)!
            .trim()
        : process.env.VERCEL
          ? String(
              req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress,
            )
          : req.socket.remoteAddress || "local",
    });
    if (result.cookie) res.setHeader("Set-Cookie", result.cookie);
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch {
    res.statusCode = 503;
    res.end(
      JSON.stringify({
        error:
          "Accounts are temporarily unavailable. Your on-device world is safe.",
      }),
    );
  }
}
