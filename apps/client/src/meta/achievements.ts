import { CHARACTER_LIST } from "@jjk/game-core";
import type { MetaProfile, RunRecord } from "./metaApi";

const ROSTER_IDS = CHARACTER_LIST.map((c) => c.id);

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  profile: MetaProfile;
  record: RunRecord;
  level: number;
  bossDefeated: boolean;
  domainUsed: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_blood",
    label: "First Exorcism",
    description: "Complete one run",
    check: () => true,
  },
  {
    id: "lv_10",
    label: "Awakened",
    description: "Reach level 10 in a single run",
    check: (c) => c.level >= 10,
  },
  {
    id: "lv_20",
    label: "Master Sorcerer",
    description: "Reach level 20 in a single run",
    check: (c) => c.level >= 20,
  },
  {
    id: "boss_killed",
    label: "Special Grade Slayer",
    description: "Defeat the boss",
    check: (c) => c.bossDefeated,
  },
  {
    id: "no_domain",
    label: "Restraint",
    description: "Reach 200 exorcisms without using Domain Expansion",
    check: (c) => !c.domainUsed && c.record.exorcismCount >= 200,
  },
  {
    id: "all_chars",
    label: "Full Roster",
    description: "Complete a run with every playable sorcerer",
    check: (c) => {
      const ids = new Set<string>(Object.keys(c.profile.characterStats));
      ids.add(c.record.characterId);
      return ROSTER_IDS.every((k) => ids.has(k));
    },
  },
  {
    id: "grade1_clear",
    label: "Grade 1 Exorcist",
    description: "Earn a Grade 1 result",
    check: (c) => /Grade 1|Special Grade/i.test(c.record.grade),
  },
  {
    id: "special_grade",
    label: "Special Grade",
    description: "Earn the Special Grade result",
    check: (c) => /Special Grade/i.test(c.record.grade),
  },
];

const ACH_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementLabel(id: string): string {
  return ACH_BY_ID.get(id)?.label ?? id;
}

/** Returns achievement IDs newly earned by this run (not already in profile) */
export function newlyEarned(ctx: AchievementContext): AchievementDef[] {
  const owned = new Set(ctx.profile.achievements);
  return ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.check(ctx));
}
