import { useCallback, useEffect, useState } from "react";
import {
  emptyProfile,
  fetchMeta,
  postRun,
  saveMeta,
  type MetaProfile,
  type RunRecord,
} from "./metaApi";

export function useMeta(userId: string | null) {
  const [profile, setProfile] = useState<MetaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchMeta(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load meta");
      setProfile(emptyProfile());
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
        return true;
      } catch (e) {
        console.warn("[meta] purchase save failed", e);
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
        return saved;
      } catch (e) {
        console.warn("[meta] post run failed", e);
        return null;
      }
    },
    [userId]
  );

  return { profile, loading, error, refresh, purchase, recordRun, setProfile };
}
