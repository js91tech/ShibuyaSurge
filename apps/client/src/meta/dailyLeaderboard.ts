/**
 * Local-only daily leaderboard cache (Tier 4 #15).
 *
 * The real server-side leaderboard is a separate problem; this module just
 * remembers the *player's* personal daily best per seed plus any friend
 * scores ingested manually (e.g. from a shared link or a future API). It's
 * sufficient to render a "Daily Best" card on the title screen and a row
 * under the daily-run start button.
 */

const KEY = "jjk_daily_lb_v1";
const MAX_ENTRIES_PER_SEED = 10;

export interface LeaderboardEntry {
  user: string;
  score: number;
  ts: number;
}

export interface LeaderboardCache {
  /** Last seen seed string -> friend entries the client knows about. */
  bySeed: Record<string, LeaderboardEntry[]>;
}

function load(): LeaderboardCache {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as LeaderboardCache;
  } catch {
    /* noop */
  }
  return { bySeed: {} };
}

function save(cache: LeaderboardCache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* noop */
  }
}

export function recordDailyScore(seed: string, entry: LeaderboardEntry): void {
  const cache = load();
  const arr = cache.bySeed[seed] ?? [];
  arr.push(entry);
  arr.sort((a, b) => b.score - a.score);
  cache.bySeed[seed] = arr.slice(0, MAX_ENTRIES_PER_SEED);
  save(cache);
}

export function topForSeed(seed: string): LeaderboardEntry[] {
  return load().bySeed[seed] ?? [];
}
