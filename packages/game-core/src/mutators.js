/**
 * Curse-grade run mutators — picked at run start (up to 3), combine into a
 * single `MutatorEffects` bundle that the engine applies on top of base
 * balance. Mutators are intentionally side-effecty: each one buffs something
 * and nerfs something else so they're meaningful build choices rather than
 * pure power creep.
 */
export const MUTATORS = [
    {
        id: "double_curse",
        name: "Double Curse",
        blurb: "Enemies spawn 50% faster. XP gain +15%.",
        color: 0xa78bfa,
    },
    {
        id: "no_heal",
        name: "No Reverse Cursed",
        blurb: "No HP pickups drop. All other drops +1.",
        color: 0xf87171,
    },
    {
        id: "boss_rush",
        name: "Boss Rush",
        blurb: "Boss spawns at 90s. Boss HP −20%.",
        color: 0xef4444,
    },
    {
        id: "glass_cannon",
        name: "Glass Cannon",
        blurb: "Max HP −30%, technique damage +40%.",
        color: 0xfb923c,
    },
    {
        id: "swarm_tide",
        name: "Swarm Tide",
        blurb: "Only swarm + flyer spawn. Their HP −40%.",
        color: 0x60a5fa,
    },
    {
        id: "magnet_sage",
        name: "Magnet Sage",
        blurb: "Pickup magnet 3×. Move speed −10%.",
        color: 0xfacc15,
    },
    {
        id: "frenzy",
        name: "Frenzy",
        blurb: "All cooldowns −25%. Streak decays in half the time.",
        color: 0xa3e635,
    },
    {
        id: "elite_market",
        name: "Elite Market",
        blurb: "Elite spawn rate 3×. Elites drop double XP.",
        color: 0xc084fc,
    },
    {
        id: "cursed_dawn",
        name: "Cursed Dawn",
        blurb: "Out-of-combat regen 2×. Domain power −25%.",
        color: 0x34d399,
    },
    {
        id: "spartan",
        name: "Spartan",
        blurb: "Start at level 5 with no draft until level 10.",
        color: 0xfbbf24,
    },
];
const MUTATOR_BY_ID = new Map(MUTATORS.map((m) => [m.id, m]));
export function getMutator(id) {
    return MUTATOR_BY_ID.get(id);
}
export const NEUTRAL_EFFECTS = {
    spawnRateMul: 1,
    xpMul: 1,
    techDmgMul: 1,
    maxHpMul: 1,
    speedMul: 1,
    cooldownMul: 1,
    bossHpMul: 1,
    bossSpawnAtSec: 180,
    magnetMul: 1,
    regenMul: 1,
    domainMul: 1,
    streakDecayMul: 1,
    eliteSpawnMul: 1,
    eliteXpMul: 1,
    healDropEnabled: true,
    swarmOnly: false,
    startLevel: 1,
    noDraftBeforeLevel: 0,
};
export function applyMutators(ids) {
    const e = { ...NEUTRAL_EFFECTS };
    for (const id of ids) {
        switch (id) {
            case "double_curse":
                // Double the curse, modest XP bump — +50% spawns already means more
                // gems on the ground; we don't need to also amplify per-gem value.
                e.spawnRateMul *= 1.5;
                e.xpMul *= 1.15;
                break;
            case "no_heal":
                e.healDropEnabled = false;
                break;
            case "boss_rush":
                e.bossSpawnAtSec = 90;
                e.bossHpMul *= 0.8;
                break;
            case "glass_cannon":
                e.maxHpMul *= 0.7;
                e.techDmgMul *= 1.4;
                break;
            case "swarm_tide":
                e.swarmOnly = true;
                break;
            case "magnet_sage":
                e.magnetMul *= 3;
                e.speedMul *= 0.9;
                break;
            case "frenzy":
                e.cooldownMul *= 0.75;
                e.streakDecayMul *= 0.5;
                break;
            case "elite_market":
                e.eliteSpawnMul *= 3;
                e.eliteXpMul *= 2;
                break;
            case "cursed_dawn":
                e.regenMul *= 2;
                e.domainMul *= 0.75;
                break;
            case "spartan":
                e.startLevel = Math.max(e.startLevel, 5);
                e.noDraftBeforeLevel = Math.max(e.noDraftBeforeLevel, 10);
                break;
        }
    }
    return e;
}
