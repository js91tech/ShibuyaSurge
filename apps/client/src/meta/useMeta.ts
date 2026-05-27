import { useCallback, useEffect, useState } from "react";
import {
  emptyProfile,
  fetchMeta,
  postRun,
  saveMeta,
  type MetaProfile,
  type RunRecord,
} from "./metaApi";
import { cacheProfile, loadCachedProfile } from "./localMetaStore";

export function useMeta(userId: string | null) {
  const [profile, setProfile] = useState<MetaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchMeta(userId);
      setProfile(p);
      cacheProfile(userId, p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load meta");
      // If the server is unreachable (solo offline, dev server not running,
      // or Discord proxy issues), fall back to the last cached profile so
      // players still have "permanent" progression within this browser.
      try {
        setProfile(loadCachedProfile(userId));
      } catch {
        setProfile(emptyProfile());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (unlockId: string, cost: number) => {
      if (!userId) return false;
      const base = profile ?? emptyProfile();
      if (base.talismans < cost || base.unlocks.includes(unlockId)) return false;
      const next: MetaProfile = {
        ...base,
        talismans: base.talismans - cost,
        unlocks: [...base.unlocks, unlockId],
      };
      setProfile(next);
      try {
        const saved = await saveMeta(userId, {
          talismans: next.talismans,
          unlocks: next.unlocks,
        });
        setProfile(saved);
        cacheProfile(userId, saved);
        return true;
      } catch (e) {
        console.warn("[meta] purchase save failed", e);
        // Keep local progression even if the server save fails.
        cacheProfile(userId, next);
        return false;
      }
    },
    [userId, profile]
  );

  const recordRun = useCallback(
    async (payload: {
      record: RunRecord;
      talismanDelta?: number;
      newAchievements?: string[];
      dailySeed?: string;
      dailyBest?: number;
    }) => {
      if (!userId) return null;
      try {
        const saved = await postRun(userId, payload);
        setProfile(saved);
        cacheProfile(userId, saved);
        return saved;
      } catch (e) {
        console.warn("[meta] post run failed", e);
        // Best-effort local persistence so solo runs still feel sticky when
        // the server isn't available. This intentionally doesn't try to
        // reproduce server-side normalization; it just keeps the last known
        // profile around for the player.
        const base = profile ?? loadCachedProfile(userId);
        const talismanDelta = payload.talismanDelta ?? 0;
        const ach = new Set(base.achievements);
        for (const a of payload.newAchievements ?? []) ach.add(a);
        const next: MetaProfile = {
          ...base,
          talismans: base.talismans + talismanDelta,
          // Append to the front; cap matches server HISTORY_LIMIT (30).
          history: [payload.record, ...base.history].slice(0, 30),
          achievements: [...ach],
          dailySeed: payload.dailySeed ?? base.dailySeed,
          dailyBest:
            payload.dailySeed && payload.dailySeed === base.dailySeed
              ? Math.max(base.dailyBest ?? 0, payload.dailyBest ?? 0)
              : payload.dailyBest ?? base.dailyBest,
        };
        setProfile(next);
        cacheProfile(userId, next);
        return null;
      }
    },
    [userId, profile]
  );

  return { profile, loading, error, refresh, purchase, recordRun, setProfile };
}
