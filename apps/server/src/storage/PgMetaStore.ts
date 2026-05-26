import pg from "pg";
import type { MetaProfile, MetaStore } from "./types.js";
import { normalize } from "./types.js";

const { Pool } = pg;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    user_id    TEXT        PRIMARY KEY,
    data       JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const UPSERT_SQL = `
  INSERT INTO profiles (user_id, data)
  VALUES ($1, $2)
  ON CONFLICT (user_id) DO UPDATE
    SET data = EXCLUDED.data,
        updated_at = now();
`;

const SELECT_SQL = `SELECT data FROM profiles WHERE user_id = $1`;

/**
 * Postgres-backed store. One row per Discord/local user, profile stored as a
 * JSONB blob. Used when DATABASE_URL is set.
 */
export class PgMetaStore implements MetaStore {
  private pool: pg.Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    const isLocal =
      /localhost|127\.0\.0\.1|::1/.test(connectionString) ||
      process.env.PGSSLMODE === "disable";

    this.pool = new Pool({
      connectionString,
      // Railway / Heroku-style managed Postgres usually requires SSL.
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 5,
    });

    this.pool.on("error", (err) => {
      console.error("[meta:pg] idle client error", err);
    });

    this.ready = this.pool.query(CREATE_TABLE_SQL).then(
      () => {
        console.log("[meta:pg] profiles table ready");
      },
      (err) => {
        console.error("[meta:pg] CREATE TABLE failed", err);
        throw err;
      }
    );
  }

  /** Resolves once the schema bootstrap has finished (or rejects on failure). */
  async init(): Promise<void> {
    await this.ready;
  }

  async get(userId: string): Promise<MetaProfile | null> {
    await this.ready;
    const res = await this.pool.query<{ data: MetaProfile }>(SELECT_SQL, [userId]);
    if (res.rowCount === 0) return null;
    return normalize(res.rows[0].data);
  }

  async put(userId: string, profile: MetaProfile): Promise<void> {
    await this.ready;
    await this.pool.query(UPSERT_SQL, [userId, normalize(profile)]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
