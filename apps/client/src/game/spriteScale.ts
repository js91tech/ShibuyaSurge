import { ENEMIES } from "@jjk/game-core";
import { getTrimmedDims } from "./spriteCleanup";

/**
 * Target world-space heights for trimmed sprites, in pixels at scale 1.
 * The runtime scale is derived as targetHeight / trimmedHeight so every
 * sprite ends up at a consistent on-screen size regardless of source PNG.
 */
const PLAYER_TARGET_H = 110;
const ENEMY_TARGET_H = 64;
const TANK_TARGET_H = 80;
const SWARM_TARGET_H = 48;
const ELITE_TARGET_H = 92;
const BOSS_TARGET_H = 150;
const PICKUP_TARGET_H = 28;

const PLAYER_FALLBACK = 0.32;
const ENEMY_FALLBACK = 0.3;
const PICKUP_FALLBACK = 0.35;

function scaleFor(textureKey: string, targetH: number, fallback: number): number {
  const dims = getTrimmedDims(textureKey);
  if (!dims || !dims.h) return fallback;
  return targetH / dims.h;
}

export function playerDisplayScale(characterId: string): number {
  return scaleFor(`player_${characterId}`, PLAYER_TARGET_H, PLAYER_FALLBACK);
}

export function enemyDisplayScale(
  typeId: string,
  opts?: { boss?: boolean; elite?: boolean }
): number {
  const def = ENEMIES[typeId];
  const isBoss = opts?.boss || def?.isBoss;
  const isElite = opts?.elite || def?.isElite;

  let targetH = ENEMY_TARGET_H;
  if (isBoss) targetH = BOSS_TARGET_H;
  else if (isElite) targetH = ELITE_TARGET_H;
  else if (typeId === "tank") targetH = TANK_TARGET_H;
  else if (typeId === "swarm") targetH = SWARM_TARGET_H;

  const key = isBoss
    ? `enemy_${typeId}` // boss_jogo / boss_hanami / boss_mahito — all baked
    : isElite
    ? "enemy_elite_grade1"
    : `enemy_${typeId}`;
  return scaleFor(key, targetH, ENEMY_FALLBACK);
}

export function pickupDisplayScale(): number {
  return scaleFor("pickup_xp", PICKUP_TARGET_H, PICKUP_FALLBACK);
}
