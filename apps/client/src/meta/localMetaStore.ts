import { emptyProfile, type MetaProfile } from "./metaApi";

const KEY = "jjk_meta_cache_v1";

interface CacheShape {
  byUserId: Record<string, MetaProfile>;
}

function load(): CacheShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CacheShape;
  } catch {
    /* noop */
  }
  return { byUserId: {} };
}

function save(next: CacheShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export function loadCachedProfile(userId: string): MetaProfile {
  return load().byUserId[userId] ?? emptyProfile();
}

export function cacheProfile(userId: string, profile: MetaProfile): void {
  const cache = load();
  cache.byUserId[userId] = profile;
  save(cache);
}

