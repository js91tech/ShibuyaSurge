import { CHARACTER_LIST } from "@jjk/game-core";
import type { MetaProfile } from "./metaApi";

/** Short progress line for locked achievements (null = no meter available). */
export function achievementProgressText(
  achievementId: string,
  profile: MetaProfile | null
): string | null {
  if (!profile) return null;
  const cs = profile.characterStats;

  switch (achievementId) {
    case "all_chars": {
      const played = new Set(Object.keys(cs));
      const total = CHARACTER_LIST.length;
      const count = CHARACTER_LIST.filter((c) => played.has(c.id)).length;
      return `${count}/${total} sorcerers played`;
    }
    case "lv_10":
    case "lv_20":
    case "boss_killed":
    case "no_domain":
    case "grade1_clear":
    case "special_grade":
      return "Complete a run to progress";
    case "first_blood":
      return profile.history.length > 0 ? "Almost there" : "Finish any run";
    default:
      return null;
  }
}
