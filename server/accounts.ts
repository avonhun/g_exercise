import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { migrate } from "../src/engine";
import type { Database } from "./database";
const scrypt = promisify(scryptCallback);
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const TTL = 30 * 86400000;
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await scrypt(password, salt, 64)) as Buffer).toString("hex")
  );
}
export async function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return (
    key.length === 128 && timingSafeEqual(derived, Buffer.from(key, "hex"))
  );
}
export interface AccountRequest {
  method: string;
  action: string;
  origin?: string;
  cookie?: string;
  body?: unknown;
  ip: string;
}
export interface AccountResult {
  status: number;
  body: unknown;
  cookie?: string;
}
interface Player {
  id: string;
  username: string;
  password_hash: string;
}
export function accountService(
  db: Database,
  {
    origin,
    secure = true,
    now = Date.now,
  }: { origin: string; secure?: boolean; now?: () => number },
) {
  const cookieName = secure ? "__Host-living_world" : "living_world_dev";
  const cookie = (token: string, age: number) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const tokenOf = (req: AccountRequest) =>
    (req.cookie || "")
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) || "";
  async function player(req: AccountRequest) {
    const token = tokenOf(req);
    if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
    const rows = await db.query<Player>(
      "SELECT p.id,p.username,p.password_hash FROM players p JOIN sessions s ON s.player_id=p.id WHERE s.token_hash=$1 AND s.expires_at>$2",
      [hash(token), now()],
    );
    return rows[0];
  }
  async function limit(key: string, max: number) {
    const bucket = hash(key) + ":" + Math.floor(now() / 900000);
    const rows = await db.query<{ attempts: number }>(
      "INSERT INTO auth_limits(bucket,attempts,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET attempts=auth_limits.attempts+1 RETURNING attempts",
      [bucket, now() + 1800000],
    );
    return rows[0].attempts <= max;
  }
  async function session(req: AccountRequest, p: Player) {
    const previous = tokenOf(req);
    if (previous)
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        hash(previous),
      ]);
    const token = randomBytes(32).toString("hex");
    await db.query(
      "INSERT INTO sessions(token_hash,player_id,expires_at) VALUES($1,$2,$3)",
      [hash(token), p.id, now() + TTL],
    );
    return {
      status: 200,
      body: { player: { id: p.id, username: p.username } },
      cookie: cookie(token, TTL / 1000),
    };
  }
  return async (req: AccountRequest): Promise<AccountResult> => {
    const fail = (status: number, error: string) => ({
      status,
      body: { error },
    });
    const write = req.method === "POST";
    if (!["GET", "POST"].includes(req.method))
      return fail(405, "Method not allowed");
    if (write && req.origin !== origin)
      return fail(403, "Request origin is not allowed");
    const body = req.body as Record<string, unknown> | undefined;
    if (write && (!body || typeof body !== "object" || Array.isArray(body)))
      return fail(400, "Invalid request");
    if (["register", "login"].includes(req.action)) {
      await db.query("DELETE FROM auth_limits WHERE expires_at<$1", [now()]);
      await db.query("DELETE FROM sessions WHERE expires_at<$1", [now()]);
      if (!write) return fail(405, "Use POST");
      if (!(await limit("ip:" + req.ip, 40)))
        return fail(429, "Too many attempts. Try again in 15 minutes.");
      const username =
        typeof body!.username === "string"
          ? body!.username.trim().toLowerCase()
          : "";
      const password = body!.password;
      if (
        !/^[a-z0-9_]{3,30}$/.test(username) ||
        typeof password !== "string" ||
        password.length < 12 ||
        password.length > 128
      )
        return fail(
          400,
          "Use a 3–30 character username (letters, numbers, underscores) and a 12–128 character password.",
        );
      if (!(await limit("user:" + username, 20)))
        return fail(429, "Too many attempts. Try again in 15 minutes.");
      if (req.action === "register") {
        if (!(await limit("register:" + req.ip, 5)))
          return fail(429, "Too many registrations. Try again later.");
        const p = {
          id: randomUUID(),
          username,
          password_hash: await passwordHash(password),
        };
        const inserted = await db.query<Player>(
          "INSERT INTO players(id,username,password_hash,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(username) DO NOTHING RETURNING id,username,password_hash",
          [p.id, p.username, p.password_hash, now()],
        );
        if (!inserted.length) return fail(409, "That username is unavailable");
        return session(req, p);
      }
      const found = (
        await db.query<Player>(
          "SELECT id,username,password_hash FROM players WHERE username=$1",
          [username],
        )
      )[0];
      // Spend the same expensive hash work when a username does not exist.
      const valid = await passwordMatches(
        password,
        found?.password_hash ||
          "00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!found || !valid) return fail(401, "Incorrect username or password");
      return session(req, found);
    }
    if (req.action === "logout") {
      if (!write) return fail(405, "Use POST");
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        hash(tokenOf(req)),
      ]);
      return { status: 200, body: { ok: true }, cookie: cookie("", 0) };
    }
    const p = await player(req);
    if (req.action === "session" && req.method === "GET")
      return {
        status: 200,
        body: { player: p ? { id: p.id, username: p.username } : null },
      };
    if (!p) return fail(401, "Sign in to access your world");
    if (req.action === "world") {
      if (req.method === "GET") {
        const row = (
          await db.query<{ revision: number; snapshot: string }>(
            "SELECT revision,snapshot FROM worlds WHERE player_id=$1",
            [p.id],
          )
        )[0];
        return {
          status: 200,
          body: {
            revision: row?.revision || 0,
            save: row ? JSON.parse(row.snapshot) : null,
          },
        };
      }
      const revision = body!.revision;
      if (!Number.isSafeInteger(revision) || Number(revision) < 0)
        return fail(400, "Invalid save revision");
      let save;
      try {
        save = migrate(body!.save);
      } catch {
        return fail(400, "Invalid world save");
      }
      const snapshot = JSON.stringify(save);
      if (Buffer.byteLength(snapshot) > 4 * 1024 * 1024)
        return fail(413, "World is too large to sync. Export a backup.");
      const rows =
        revision === 0
          ? await db.query(
              "INSERT INTO worlds(player_id,revision,snapshot,updated_at) VALUES($1,1,$2,$3) ON CONFLICT(player_id) DO NOTHING RETURNING revision",
              [p.id, snapshot, now()],
            )
          : await db.query(
              "UPDATE worlds SET revision=revision+1,snapshot=$1,updated_at=$2 WHERE player_id=$3 AND revision=$4 RETURNING revision",
              [snapshot, now(), p.id, revision],
            );
      if (!rows.length)
        return fail(
          409,
          "Another device saved a newer world. Export this device’s world or load the cloud copy.",
        );
      return { status: 200, body: { revision: Number(revision) + 1 } };
    }
    if (req.action === "password" && write) {
      const old = body!.currentPassword,
        next = body!.newPassword;
      if (
        typeof old !== "string" ||
        typeof next !== "string" ||
        old.length > 128 ||
        next.length < 12 ||
        next.length > 128
      )
        return fail(400, "Choose a password of 12–128 characters");
      if (!(await limit("password:" + p.id, 10)))
        return fail(429, "Try again later");
      if (!(await passwordMatches(old, p.password_hash)))
        return fail(401, "Current password is incorrect");
      await db.query("UPDATE players SET password_hash=$1 WHERE id=$2", [
        await passwordHash(next),
        p.id,
      ]);
      await db.query("DELETE FROM sessions WHERE player_id=$1", [p.id]);
      return session(req, p);
    }
    return fail(404, "Unknown account action");
  };
}
