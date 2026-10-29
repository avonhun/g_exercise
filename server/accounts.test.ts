import { beforeEach, describe, it, expect } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { accountService, passwordMatches } from "./accounts";
import { initialize, type Database } from "./database";
import { fresh } from "../src/engine";
let db: Database;
let time = Date.now();
let service: ReturnType<typeof accountService>;
const origin = "https://world.example.com";
beforeEach(async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  db = {
    query: async <T>(sql: string, params: unknown[] = []) => {
      const values: unknown[] = [];
      return sqlite
        .prepare(
          sql.replace(/\$(\d+)/g, (_, n) => {
            values.push(params[+n - 1]);
            return "?";
          }),
        )
        .all(...(values as never[])) as T[];
    },
  };
  await initialize(db);
  service = accountService(db, { origin, now: () => time });
});
const request = (
  action: string,
  body?: unknown,
  cookie?: string,
  otherOrigin = origin,
) =>
  service({
    action,
    method: body ? "POST" : "GET",
    origin: otherOrigin,
    body,
    cookie,
    ip: "test",
  });
async function register(name = "settler") {
  const response = await request("register", {
    username: name,
    password: "a long secret password",
  });
  expect(response.status).toBe(200);
  return response.cookie!.split(";")[0];
}
describe("account security and ownership", () => {
  it("stores password hashes, hashes session tokens, and sets secure cookies", async () => {
    const cookie = await register();
    const p = (
      await db.query<{ password_hash: string }>(
        "SELECT password_hash FROM players",
      )
    )[0];
    expect(p.password_hash).not.toContain("a long secret");
    expect(
      await passwordMatches("a long secret password", p.password_hash),
    ).toBe(true);
    expect(
      (
        await db.query<{ token_hash: string }>(
          "SELECT token_hash FROM sessions",
        )
      )[0].token_hash,
    ).not.toBe(cookie.split("=")[1]);
    const r = await request("login", {
      username: "settler",
      password: "a long secret password",
    });
    expect(r.cookie).toContain("HttpOnly");
    expect(r.cookie).toContain("Secure");
    expect(r.cookie).toContain("SameSite=Lax");
    expect(r.cookie).toContain("Path=/");
  });
  it("rejects bad credentials, weak passwords and cross-origin writes", async () => {
    await register();
    expect(
      (
        await request("login", {
          username: "settler",
          password: "wrong but long password",
        })
      ).status,
    ).toBe(401);
    expect(
      (await request("register", { username: "new", password: "short" }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(
          "register",
          { username: "evil", password: "long enough password" },
          undefined,
          "https://evil.example",
        )
      ).status,
    ).toBe(403);
  });
  it("requires authentication and isolates private worlds between users", async () => {
    const a = await register("alice"),
      b = await register("bob");
    const save = fresh(time);
    expect((await request("world", { revision: 0, save }, a)).status).toBe(200);
    expect((await request("world", undefined, b)).body).toEqual({
      revision: 0,
      save: null,
    });
    expect((await request("world")).status).toBe(401);
    expect((await request("world", undefined, a)).body).toEqual({
      revision: 1,
      save,
    });
  });
  it("uses compare-and-swap revisions so stale devices cannot overwrite progress", async () => {
    const cookie = await register();
    const save = fresh(time);
    expect((await request("world", { revision: 0, save }, cookie)).status).toBe(
      200,
    );
    expect((await request("world", { revision: 0, save }, cookie)).status).toBe(
      409,
    );
    expect((await request("world", { revision: 1, save }, cookie)).status).toBe(
      200,
    );
    expect((await request("world", { revision: 1, save }, cookie)).status).toBe(
      409,
    );
  });
  it("rejects corrupt saves and invalid revisions", async () => {
    const cookie = await register();
    expect(
      (await request("world", { revision: -1, save: fresh(time) }, cookie))
        .status,
    ).toBe(400);
    expect(
      (await request("world", { revision: 0, save: { schema: 999 } }, cookie))
        .status,
    ).toBe(400);
  });
  it("revokes sessions on logout and enforces expiry", async () => {
    const cookie = await register();
    expect((await request("session", undefined, cookie)).body).toHaveProperty(
      "player.username",
      "settler",
    );
    await request("logout", {}, cookie);
    expect((await request("session", undefined, cookie)).body).toEqual({
      player: null,
    });
    const login = await request("login", {
      username: "settler",
      password: "a long secret password",
    });
    time += 31 * 86400000;
    expect(
      (await request("session", undefined, login.cookie!.split(";")[0])).body,
    ).toEqual({ player: null });
  });
  it("changes passwords and revokes all previous sessions", async () => {
    const a = await register();
    const b = (
      await request("login", {
        username: "settler",
        password: "a long secret password",
      })
    ).cookie!.split(";")[0];
    expect(
      (
        await request(
          "password",
          {
            currentPassword: "a long secret password",
            newPassword: "a different long password",
          },
          a,
        )
      ).status,
    ).toBe(200);
    expect((await request("session", undefined, b)).body).toEqual({
      player: null,
    });
    expect(
      (
        await request("login", {
          username: "settler",
          password: "a different long password",
        })
      ).status,
    ).toBe(200);
  });
  it("rate limits repeated credential attempts in persistent storage", async () => {
    await register();
    let status = 0;
    for (let i = 0; i < 22; i++)
      status = (
        await request("login", {
          username: "unknown",
          password: "incorrect long password",
        })
      ).status;
    expect(status).toBe(429);
  });
});
