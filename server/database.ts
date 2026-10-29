export interface Database {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
}
let active: Database | undefined;
export async function database(): Promise<Database> {
  if (active) return active;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    return (active = {
      query: async <T>(sql: string, params: unknown[] = []) =>
        (await pool.query(sql, params)).rows as T[],
    });
  }
  if (
    process.env.LOCAL_DATABASE_PATH &&
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production"
  ) {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(process.env.LOCAL_DATABASE_PATH);
    db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
    );
    return (active = {
      query: async <T>(sql: string, params: unknown[] = []) => {
        const values: unknown[] = [];
        const text = sql.replace(/\$(\d+)/g, (_, n) => {
          values.push(params[Number(n) - 1]);
          return "?";
        });
        return db.prepare(text).all(...(values as never[])) as T[];
      },
    });
  }
  throw Error("Account database is not configured");
}
export const schema = [
  `CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, expires_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS session_owner ON sessions(player_id)`,
  `CREATE TABLE IF NOT EXISTS worlds (player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE, revision INTEGER NOT NULL, snapshot TEXT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS auth_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at BIGINT NOT NULL)`,
];
export async function initialize(db: Database) {
  for (const sql of schema) await db.query(sql);
}
