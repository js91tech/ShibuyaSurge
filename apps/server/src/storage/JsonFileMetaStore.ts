import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { MetaProfile, MetaStore } from "./types.js";
import { normalize } from "./types.js";

type RawStore = Record<string, MetaProfile>;

/**
 * JSON-file backed store — the legacy local-dev behaviour. Single file under
 * `apps/server/data/meta.json`. Synchronous on disk but presented async so it
 * fits the {@link MetaStore} interface alongside the Postgres impl.
 */
export class JsonFileMetaStore implements MetaStore {
  constructor(private readonly file: string) {}

  private load(): RawStore {
    if (!existsSync(this.file)) return {};
    try {
      return JSON.parse(readFileSync(this.file, "utf-8")) as RawStore;
    } catch (err) {
      console.warn("[meta] failed to parse meta.json, starting fresh", err);
      return {};
    }
  }

  private save(data: RawStore) {
    const dir = dirname(this.file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  async get(userId: string): Promise<MetaProfile | null> {
    const store = this.load();
    const found = store[userId];
    return found ? normalize(found) : null;
  }

  async put(userId: string, profile: MetaProfile): Promise<void> {
    const store = this.load();
    store[userId] = normalize(profile);
    this.save(store);
  }
}
