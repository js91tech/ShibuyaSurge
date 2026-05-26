export interface Unlock {
  id: string;
  name: string;
  description: string;
  cost: number;
}

/** Permanent talisman upgrades. Effects are applied via `applyUnlocks()` below. */
export const UNLOCKS: Unlock[] = [
  {
    id: "hp_boost_1",
    name: "Sturdy Vessel",
    description: "+15% max HP at run start",
    cost: 30,
  },
  {
    id: "xp_boost_1",
    name: "Cursed Insight",
    description: "+15% XP gain",
    cost: 40,
  },
  {
    id: "speed_boost_1",
    name: "Light Step",
    description: "+8% move speed",
    cost: 35,
  },
  {
    id: "extra_revive",
    name: "Reverse Cursed",
    description: "+1 down before you start spectating",
    cost: 80,
  },
  {
    id: "domain_plus",
    name: "Sukuna's Wrath",
    description: "Domain Expansion deals +25% damage",
    cost: 120,
  },
  {
    id: "magnet_plus",
    name: "Beckoning Charm",
    description: "+30% pickup magnet radius",
    cost: 60,
  },
];

export interface UnlockEffects {
  hpMul: number;
  xpMul: number;
  speedMul: number;
  domainMul: number;
  magnetMul: number;
  extraDowns: number;
}

export function effectsFor(unlocks: string[]): UnlockEffects {
  const set = new Set(unlocks);
  return {
    hpMul: set.has("hp_boost_1") ? 1.15 : 1,
    xpMul: set.has("xp_boost_1") ? 1.08 : 1,
    speedMul: set.has("speed_boost_1") ? 1.08 : 1,
    domainMul: set.has("domain_plus") ? 1.25 : 1,
    magnetMul: set.has("magnet_plus") ? 1.3 : 1,
    extraDowns: set.has("extra_revive") ? 1 : 0,
  };
}

export const EMPTY_EFFECTS: UnlockEffects = {
  hpMul: 1,
  xpMul: 1,
  speedMul: 1,
  domainMul: 1,
  magnetMul: 1,
  extraDowns: 0,
};
