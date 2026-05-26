import { Router } from "express";
import { discordAuthForUserParam } from "../middleware/discordAuth.js";
import {
  HISTORY_LIMIT,
  defaultProfile,
  normalize,
  type CharacterStats,
  type MetaProfile,
  type MetaStore,
  type RunRecord,
} from "../storage/index.js";

export type { MetaProfile, RunRecord, CharacterStats } from "../storage/index.js";

/**
 * Build the meta routes against a concrete {@link MetaStore}. The store is
 * created once at boot in `index.ts` and injected here so route handlers stay
 * agnostic of Postgres vs JSON file.
 */
export function createMetaRouter(store: MetaStore): Router {
  const router = Router();

  // Express prefix-matches `/meta/:userId`, which also covers `/meta/:userId/run`.
  router.use("/meta/:userId", discordAuthForUserParam("userId"));

  router.get("/meta/:userId", async (req, res) => {
    try {
      const existing = await store.get(req.params.userId);
      res.json(existing ?? defaultProfile());
    } catch (err) {
      console.error("[meta] get failed", err);
      res.status(500).json({ error: "meta read failed" });
    }
  });

  router.post("/meta/:userId", async (req, res) => {
    const body = (req.body ?? {}) as Partial<MetaProfile>;
    try {
      const prev = (await store.get(req.params.userId)) ?? defaultProfile();
      const next = normalize({
        ...prev,
        ...body,
        talismans: body.talismans ?? prev.talismans,
        unlocks: body.unlocks ?? prev.unlocks,
        achievements: body.achievements ?? prev.achievements,
        history: (body.history ?? prev.history).slice(0, HISTORY_LIMIT),
        characterStats: body.characterStats ?? prev.characterStats,
      });
      await store.put(req.params.userId, next);
      res.json(next);
    } catch (err) {
      console.error("[meta] save failed", err);
      res.status(500).json({ error: "meta save failed" });
    }
  });

  router.post("/meta/:userId/run", async (req, res) => {
    const body = (req.body ?? {}) as {
      record?: RunRecord;
      talismanDelta?: number;
      newAchievements?: string[];
      dailySeed?: string;
      dailyBest?: number;
    };
    if (!body.record) {
      res.status(400).json({ error: "record required" });
      return;
    }

    try {
      const prev = (await store.get(req.params.userId)) ?? defaultProfile();
      const record = body.record;

      const newHistory = [record, ...prev.history].slice(0, HISTORY_LIMIT);
      const cs = { ...prev.characterStats };
      const existing: CharacterStats = cs[record.characterId] ?? {
        runs: 0,
        kills: 0,
        bestExorcisms: 0,
        bestGrade: "",
      };
      cs[record.characterId] = {
        runs: existing.runs + 1,
        kills: existing.kills + record.exorcismCount,
        bestExorcisms: Math.max(existing.bestExorcisms, record.exorcismCount),
        bestGrade:
          record.exorcismCount > existing.bestExorcisms
            ? record.grade
            : existing.bestGrade || record.grade,
      };

      const ach = new Set(prev.achievements);
      for (const a of body.newAchievements ?? []) ach.add(a);

      const next: MetaProfile = normalize({
        ...prev,
        talismans: prev.talismans + (body.talismanDelta ?? 0),
        history: newHistory,
        characterStats: cs,
        achievements: [...ach],
        dailySeed: body.dailySeed ?? prev.dailySeed,
        dailyBest:
          body.dailySeed && body.dailySeed === prev.dailySeed
            ? Math.max(prev.dailyBest ?? 0, body.dailyBest ?? 0)
            : body.dailyBest ?? prev.dailyBest,
      });

      await store.put(req.params.userId, next);
      res.json(next);
    } catch (err) {
      console.error("[meta] run save failed", err);
      res.status(500).json({ error: "meta run save failed" });
    }
  });

  router.get("/daily", (_req, res) => {
    const now = new Date();
    const seed = `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}`;
    res.json({ seed });
  });

  return router;
}
