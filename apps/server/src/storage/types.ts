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

export interface MetaStore {
  get(userId: string): Promise<MetaProfile | null>;
  put(userId: string, profile: MetaProfile): Promise<void>;
  /** Optional teardown hook (Pg pool close, etc.) */
  close?(): Promise<void>;
}

/** Server-side cap so a misbehaving client can't bloat the row. */
export const HISTORY_LIMIT = 30;

export function defaultProfile(): MetaProfile {
  return {
    talismans: 0,
    unlocks: [],
    achievements: [],
    history: [],
    characterStats: {},
  };
}

export function normalize(profile: Partial<MetaProfile> | undefined | null): MetaProfile {
  const base = defaultProfile();
  if (!profile) return base;
  return {
    ...base,
    ...profile,
    unlocks: profile.unlocks ?? base.unlocks,
    achievements: profile.achievements ?? base.achievements,
    history: (profile.history ?? base.history).slice(0, HISTORY_LIMIT),
    characterStats: profile.characterStats ?? base.characterStats,
  };
}
