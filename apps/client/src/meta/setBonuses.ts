/**
 * Talisman set bonuses (Tier 4 #16).
 *
 * Unlocks are grouped into "sets" by their primary tag, then 2-piece /
 * 4-piece bonuses apply on top of individual unlock effects. The set count
 * is just how many unlocks the player owns within that group, so the meta
 * progression turns into "do I commit to one tree or spread out".
 */

import type { UnlockEffects } from "./unlocks";

export type SetTag = "vessel" | "scholar" | "fleetfoot" | "domain";

interface SetMember {
  unlockId: string;
  tag: SetTag;
}

const SET_MEMBERS: SetMember[] = [
  { unlockId: "hp_boost_1", tag: "vessel" },
  { unlockId: "extra_revive", tag: "vessel" },
  { unlockId: "xp_boost_1", tag: "scholar" },
  { unlockId: "magnet_plus", tag: "scholar" },
  { unlockId: "speed_boost_1", tag: "fleetfoot" },
  { unlockId: "domain_plus", tag: "domain" },
];

export interface SetBonusBundle {
  hpMul: number;
  xpMul: number;
  speedMul: number;
  magnetMul: number;
  domainMul: number;
  // Display strings for the shop UI.
  active: Array<{ tag: SetTag; pieces: number; label: string }>;
}

const NEUTRAL_BUNDLE: SetBonusBundle = {
  hpMul: 1,
  xpMul: 1,
  speedMul: 1,
  magnetMul: 1,
  domainMul: 1,
  active: [],
};

/** Compute per-set bonuses on top of the flat per-unlock effects. */
export function setBonusesFor(unlocks: string[]): SetBonusBundle {
  const owned = new Set(unlocks);
  const counts: Record<SetTag, number> = {
    vessel: 0,
    scholar: 0,
    fleetfoot: 0,
    domain: 0,
  };
  for (const m of SET_MEMBERS) {
    if (owned.has(m.unlockId)) counts[m.tag] += 1;
  }

  const bundle: SetBonusBundle = { ...NEUTRAL_BUNDLE, active: [] };
  for (const tag of Object.keys(counts) as SetTag[]) {
    const n = counts[tag];
    if (n < 2) continue;
    if (tag === "vessel") {
      bundle.hpMul *= n >= 2 ? 1.1 : 1;
      bundle.hpMul *= n >= 4 ? 1.15 : 1;
      bundle.active.push({
        tag,
        pieces: n,
        label: n >= 4 ? "Vessel 4: +25% HP" : "Vessel 2: +10% HP",
      });
    }
    if (tag === "scholar") {
      // XP bonus intentionally small; the scaled level curve is the bigger
      // pacing knob and stacking +10/+15% with talisman + mutator made
      // leveling feel instant. +5% xp / +15% magnet keeps the set useful
      // without snowballing.
      bundle.xpMul *= n >= 2 ? 1.05 : 1;
      bundle.magnetMul *= n >= 2 ? 1.15 : 1;
      bundle.active.push({
        tag,
        pieces: n,
        label: "Scholar 2: +5% XP, +15% magnet",
      });
    }
    if (tag === "fleetfoot") {
      // Single-member set today — placeholder for when more unlocks land.
      bundle.speedMul *= 1.05;
      bundle.active.push({ tag, pieces: n, label: "Fleetfoot: +5% speed" });
    }
    if (tag === "domain") {
      bundle.domainMul *= n >= 2 ? 1.2 : 1;
      bundle.active.push({ tag, pieces: n, label: "Domain 2: +20% Domain damage" });
    }
  }
  return bundle;
}

/** Compose set bonuses with flat unlock effects to produce the final bundle
 *  the engine uses at run start. */
export function withSetBonuses(
  base: UnlockEffects,
  unlocks: string[]
): UnlockEffects {
  const sb = setBonusesFor(unlocks);
  return {
    ...base,
    hpMul: base.hpMul * sb.hpMul,
    xpMul: base.xpMul * sb.xpMul,
    speedMul: base.speedMul * sb.speedMul,
    magnetMul: base.magnetMul * sb.magnetMul,
    domainMul: base.domainMul * sb.domainMul,
  };
}
