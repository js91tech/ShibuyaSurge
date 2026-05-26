import { THERMAL_MULTIPLIERS, type ThermalLevel } from "@jjk/game-core";

export function thermalParticleScale(level: string): number {
  const key = (level in THERMAL_MULTIPLIERS ? level : "nominal") as ThermalLevel;
  return THERMAL_MULTIPLIERS[key];
}

export function shouldMuteMusic(level: string): boolean {
  return level === "critical" || level === "serious";
}

export function thermalEnemyCap(level: string, base: number): number {
  return Math.floor(base * thermalParticleScale(level));
}
