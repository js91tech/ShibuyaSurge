import { SYNERGY_PAIRS, TECHNIQUES, type TechniqueId } from "@jjk/game-core";

/** Score draft options for smart auto-pick (upgrades + synergies beat random first card). */
export function pickBestDraftOption(
  options: string[],
  ownedIds: TechniqueId[],
  smart: boolean
): string {
  if (!options.length) return "";
  if (!smart) return options[0];

  const owned = new Set(ownedIds);
  let best = options[0];
  let bestScore = -Infinity;

  for (const id of options) {
    let score = 0;
    if (owned.has(id as TechniqueId)) score += 4;
    const def = TECHNIQUES[id as TechniqueId];
    if (def?.tags?.includes("weapon")) score += 1;
    if (def?.tags?.includes("passive")) score += 0.5;
    for (const syn of SYNERGY_PAIRS) {
      if (!syn.ids.includes(id as TechniqueId)) continue;
      if (syn.ids.some((x) => owned.has(x))) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}
