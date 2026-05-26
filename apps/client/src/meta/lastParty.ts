/**
 * Persists the last online party (Tier 3 #13) so the title screen can offer
 * a one-tap "Run it back with last team" affordance.
 *
 * Stored in localStorage as a list of Discord usernames + characterIds; no
 * server roundtrip. The Lobby surfaces this as autopicks when the player
 * rejoins the same room within ~24 hours.
 */

const KEY = "jjk_last_party_v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PartyMember {
  username: string;
  characterId: string;
  avatarUrl?: string;
}

export interface SavedParty {
  ts: number;
  members: PartyMember[];
}

export function saveLastParty(members: PartyMember[]): void {
  if (!members.length) return;
  const payload: SavedParty = { ts: Date.now(), members };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* localStorage quota / disabled — silently skip */
  }
}

export function loadLastParty(): SavedParty | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedParty;
    if (!parsed.ts || Date.now() - parsed.ts > MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.members) || !parsed.members.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastParty(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
