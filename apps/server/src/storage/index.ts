import path from "path";
import { fileURLToPath } from "url";
import { JsonFileMetaStore } from "./JsonFileMetaStore.js";
import { PgMetaStore } from "./PgMetaStore.js";
import type { MetaStore } from "./types.js";

export type { MetaProfile, MetaStore, RunRecord, CharacterStats } from "./types.js";
export { normalize, defaultProfile, HISTORY_LIMIT } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve absolute path to the legacy json store. */
function defaultJsonPath(): string {
  return path.join(__dirname, "../../data/meta.json");
}

/**
 * Boot-time store selection: Postgres when DATABASE_URL is set and reachable,
 * JsonFile otherwise. Falls back to JsonFile (with a warning) if the Postgres
 * bootstrap query fails — this keeps local dev usable when a stale or wrong
 * DATABASE_URL is in the environment.
 */
export async function createMetaStore(): Promise<MetaStore> {
  const dbUrl = process.env.DATABASE_URL;
  const jsonPath = defaultJsonPath();

  if (!dbUrl) {
    console.log(`[meta] using JsonFileMetaStore (${jsonPath})`);
    return new JsonFileMetaStore(jsonPath);
  }

  const safeUrl = dbUrl.replace(/:[^:@/]+@/, ":****@");
  console.log(`[meta] DATABASE_URL set, attempting Postgres (${safeUrl})`);
  const pg = new PgMetaStore(dbUrl);
  try {
    await pg.init();
    console.log("[meta] using PgMetaStore");
    return pg;
  } catch (err) {
    console.warn(
      "[meta] Postgres bootstrap failed, falling back to JsonFileMetaStore",
      err
    );
    try {
      await pg.close();
    } catch {
      /* ignore */
    }
    return new JsonFileMetaStore(jsonPath);
  }
}
