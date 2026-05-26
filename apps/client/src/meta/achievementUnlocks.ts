import type { TechniqueId } from "@jjk/game-core";
import type { MetaProfile } from "./metaApi";

/**
 * Maps achievements → permanent rewards (Tier 1 #5).
 *
 * `unlockExtras` are technique IDs that begin appearing in the draft once
 * the achievement is earned. `talismanBonus` gives a one-time talisman drip
 * the next time the profile is loaded after earning the achievement.
 */
export interface AchievementReward {
  achievementId: string;
  unlockExtras?: TechniqueId[];
  talismanBonus?: number;
  label: string;
}

export const ACHIEVEMENT_REWARDS: AchievementReward[] = [
  {
    achievementId: "first_blood",
    talismanBonus: 5,
    label: "+5 talismans",
  },
  {
    achievementId: "lv_10",
    unlockExtras: ["sukuna_slash"],
    label: "Unlocks Sukuna's Slash (Yuji)",
  },
  {
    achievementId: "lv_20",
    unlockExtras: ["rabbit_escape"],
    label: "Unlocks Rabbit Escape (Megumi)",
  },
  {
    achievementId: "boss_killed",
    unlockExtras: ["hairpin"],
    talismanBonus: 20,
    label: "Unlocks Hairpin (Nobara), +20 talismans",
  },
  {
    achievementId: "special_grade",
    unlockExtras: ["infinity"],
    label: "Unlocks Infinity (Gojo)",
  },
  {
    achievementId: "all_chars",
    talismanBonus: 50,
    label: "+50 talismans",
  },
];

const REWARD_BY_ACH = new Map(ACHIEVEMENT_REWARDS.map((r) => [r.achievementId, r]));

export function rewardFor(achievementId: string): AchievementReward | undefined {
  return REWARD_BY_ACH.get(achievementId);
}

/** Returns the union of `profile.unlocks` plus any extras granted by earned
 *  achievements. Used to populate the secondary-technique pool at run start. */
export function unlockedExtras(profile: MetaProfile | null): TechniqueId[] {
  if (!profile) return [];
  const ids: TechniqueId[] = [];
  for (const aid of profile.achievements) {
    const r = REWARD_BY_ACH.get(aid);
    if (r?.unlockExtras) ids.push(...r.unlockExtras);
  }
  return ids;
}
