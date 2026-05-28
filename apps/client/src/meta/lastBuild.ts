import { TECHNIQUES, type TechniqueId } from "@jjk/game-core";

const KEY = "jjk_last_build_v1";

export interface SavedTechnique {
  id: TechniqueId;
  level: number;
}

export interface SavedBuild {
  ts: number;
  characterId: string;
  techniques: SavedTechnique[];
}

export function saveLastBuild(build: SavedBuild): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(build));
  } catch {
    /* noop */
  }
}

export function loadLastBuild(): SavedBuild | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedBuild;
  } catch {
    return null;
  }
}

export function techniqueName(id: TechniqueId): string {
  return TECHNIQUES[id]?.name ?? id;
}

