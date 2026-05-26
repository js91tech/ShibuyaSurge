export interface RunRecord {
  ts: number;
  characterId: string;
  exorcismCount: number;
  grade: string;
  durationSec: number;
  mode?: string;
}

export interface CharacterStats {
  runs: number;
  kills: number;
  bestExorcisms: number;
  bestGrade: string;
}

export interface MetaProfile {
  talismans: number;
  unlocks: string[];
  achievements: string[];
  history: RunRecord[];
  characterStats: Record<string, CharacterStats>;
  dailySeed?: string;
  dailyBest?: number;
}

/**
 * Token singleton — populated by the Discord provider once OAuth completes.
 * `null` means "no Discord token available" and we send the request
 * unauthenticated (server allows that for `local:*` ids in dev mode).
 */
let currentAccessToken: string | null = null;
export function setMetaAccessToken(token: string | null) {
  currentAccessToken = token;
}
export function getMetaAccessToken(): string | null {
  return currentAccessToken;
}

/**
 * Decide which HTTP base to use:
 * - Inside a Discord Activity iframe (host ends in `discordsays.com`) we MUST
 *   route through Discord's `/.proxy` mapping or CSP blocks the request.
 * - Outside Discord we use the dev/prod base derived from
 *   VITE_GAME_SERVER_URL.
 */
export function metaApiBase(): string {
  if (typeof window !== "undefined") {
    if (window.location.host.endsWith("discordsays.com")) {
      return "/.proxy";
    }
  }
  const ws = import.meta.env.VITE_GAME_SERVER_URL ?? "ws://localhost:3001";
  return ws.replace(/^ws(s)?:\/\//, "http$1://");
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token ?? currentAccessToken;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface MetaFetchOpts {
  /** Override the access token (otherwise uses the singleton). */
  accessToken?: string | null;
}

export async function fetchMeta(
  userId: string,
  opts: MetaFetchOpts = {}
): Promise<MetaProfile> {
  const res = await fetch(`${metaApiBase()}/api/meta/${encodeURIComponent(userId)}`, {
    headers: { ...authHeaders(opts.accessToken) },
  });
  if (!res.ok) throw new Error(`meta fetch ${res.status}`);
  return res.json() as Promise<MetaProfile>;
}

export async function saveMeta(
  userId: string,
  patch: Partial<MetaProfile>,
  opts: MetaFetchOpts = {}
): Promise<MetaProfile> {
  const res = await fetch(`${metaApiBase()}/api/meta/${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(opts.accessToken) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`meta save ${res.status}`);
  return res.json() as Promise<MetaProfile>;
}

export async function postRun(
  userId: string,
  payload: {
    record: RunRecord;
    talismanDelta?: number;
    newAchievements?: string[];
    dailySeed?: string;
    dailyBest?: number;
  },
  opts: MetaFetchOpts = {}
): Promise<MetaProfile> {
  const res = await fetch(
    `${metaApiBase()}/api/meta/${encodeURIComponent(userId)}/run`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(opts.accessToken) },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(`meta post run ${res.status}`);
  return res.json() as Promise<MetaProfile>;
}

export async function fetchDailySeed(): Promise<string> {
  try {
    const res = await fetch(`${metaApiBase()}/api/daily`);
    if (res.ok) {
      const data = (await res.json()) as { seed: string };
      return data.seed;
    }
  } catch {
    /* fall through to local fallback */
  }
  const now = new Date();
  return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
}

export function talismansFromRun(exorcismCount: number): number {
  return Math.floor(exorcismCount / 10);
}

const LOCAL_USER_KEY = "jjk_local_user_id";
const LOCAL_PREFIX = "local:";
const DISCORD_PREFIX = "discord:";

/**
 * Get-or-create a per-browser anonymous user id. Always returns the
 * `local:<id>` form. Migrates legacy unprefixed entries once on read so
 * pre-existing dev profiles aren't orphaned.
 */
export function getOrCreateLocalUserId(): string {
  let id = localStorage.getItem(LOCAL_USER_KEY);
  if (!id) {
    id = `${LOCAL_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(LOCAL_USER_KEY, id);
    return id;
  }
  if (!id.startsWith(LOCAL_PREFIX) && !id.startsWith(DISCORD_PREFIX)) {
    id = `${LOCAL_PREFIX}${id}`;
    localStorage.setItem(LOCAL_USER_KEY, id);
  }
  return id;
}

/**
 * Build a namespaced user id from the resolved Discord identity. Returns
 * `discord:<id>` for real Discord users, `local:<uuid>` otherwise.
 */
export function buildMetaUserId(args: {
  isDiscord: boolean;
  discordUserId: string | null | undefined;
}): string {
  const isMockUser = !args.discordUserId || args.discordUserId === "dev-user";
  if (args.isDiscord && !isMockUser && args.discordUserId) {
    return `${DISCORD_PREFIX}${args.discordUserId}`;
  }
  return getOrCreateLocalUserId();
}

export function emptyProfile(): MetaProfile {
  return {
    talismans: 0,
    unlocks: [],
    achievements: [],
    history: [],
    characterStats: {},
  };
}
