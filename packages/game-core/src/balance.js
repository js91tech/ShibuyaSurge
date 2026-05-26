export const RUN_DURATION_SEC = 12 * 60;
export const MAX_PLAYERS = 4;
export const REVIVE_CHANNEL_SEC = 5;
export const MAX_DOWNS = 2;
/**
 * Flat XP-per-level constant. Note: the *effective* XP needed to reach a
 * level now also grows ~15% per level via {@link xpForLevel}, but several
 * legacy paths (HUD bar fill, server-side per-player level math) still
 * divide by this constant; keep it as the single tunable knob for the
 * opening difficulty.
 */
export const XP_PER_LEVEL = 80;
export const LEVEL_SLOW_FACTOR = 0.1;
/** Per-level growth applied to XP cost on top of the flat constant. */
export const XP_LEVEL_GROWTH = 0.15;
export const ENEMY_CAPS = {
    trash: 120,
    pool: 200,
    projectiles: 400,
};
export const THERMAL_MULTIPLIERS = {
    nominal: 1,
    light: 0.85,
    moderate: 0.7,
    serious: 0.5,
    critical: 0.25,
};
export function spawnRate(elapsedSec, playerCount) {
    // Slightly slower opening so the player isn't drowning by 30s; ramps up
    // every 2 minutes. Tuned with the slower per-tech damage curve in mind.
    const base = 0.65 + elapsedSec / 140;
    return base * (1 + (playerCount - 1) * 0.32);
}
/**
 * Cost (in XP) to reach `level` from `level - 1`. Linear growth on top of
 * the flat base — gentle enough that early levels still feel snappy but
 * mid-/late-game requires more committed clears.
 */
export function xpForLevel(level) {
    return XP_PER_LEVEL * (1 + XP_LEVEL_GROWTH * Math.max(0, level - 1));
}
/**
 * Compute current level + remainder XP from a running total. The remainder
 * is intentionally returned so HUDs can render the bar without re-running
 * the cumulative loop.
 */
export function levelFromXp(totalXp) {
    let level = 1;
    let remaining = totalXp;
    // Loop is bounded by how much XP a player can realistically accumulate
    // in a 12-minute run; in practice this stays well under 60 iterations.
    while (true) {
        const need = xpForLevel(level);
        if (remaining < need)
            return { level, intoLevel: remaining, need };
        remaining -= need;
        level += 1;
    }
}
export function xpToLevel(totalXp) {
    return levelFromXp(totalXp).level;
}
