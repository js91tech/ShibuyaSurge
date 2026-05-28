import {
  DEFAULT_STAGE,
  type CharacterId,
  type MutatorId,
  type StageId,
} from "@jjk/game-core";

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  particles: "low" | "medium" | "high";
  showFps: boolean;
  showTips: boolean;
  showRunStats: boolean;
  autoPickUpgrade: boolean;
  /** When auto-pick is on, prefer upgrades and synergy picks over the first card. */
  smartAutoPick: boolean;
  reduceMotion: boolean;
  largeTouch: boolean;
  colorBlind: boolean;
  hudScale: number;
  pauseOnHidden: boolean;
  skipSoloLobby: boolean;
  practiceMode: boolean;
  hapticsOn: boolean;
  tutorialSeen: boolean;
  lastCharacter: CharacterId;
  lastStage: StageId;
  lastMutators: MutatorId[];
}

const KEY = "jjk_settings";

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.3,
  sfxVolume: 0.8,
  particles: "medium",
  showFps: false,
  showTips: true,
  showRunStats: false,
  autoPickUpgrade: false,
  smartAutoPick: true,
  reduceMotion: false,
  largeTouch: false,
  colorBlind: false,
  hudScale: 1,
  pauseOnHidden: true,
  skipSoloLobby: false,
  practiceMode: false,
  hapticsOn: true,
  tutorialSeen: false,
  lastCharacter: "yuji",
  lastStage: DEFAULT_STAGE,
  lastMutators: [],
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: GameSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function loadHighScore(): number {
  return Number(localStorage.getItem("jjk_highscore") ?? 0);
}

export function saveHighScore(n: number) {
  const prev = loadHighScore();
  if (n > prev) localStorage.setItem("jjk_highscore", String(n));
}

export function rememberCharacter(id: CharacterId) {
  saveSettings({ ...loadSettings(), lastCharacter: id });
}

export function loadLastCharacter(): CharacterId {
  return loadSettings().lastCharacter;
}

export function rememberLoadout(stage: StageId, mutators: MutatorId[]) {
  saveSettings({ ...loadSettings(), lastStage: stage, lastMutators: mutators });
}

export function loadLastLoadout(): { stage: StageId; mutators: MutatorId[] } {
  const s = loadSettings();
  return {
    stage: s.lastStage ?? DEFAULT_STAGE,
    mutators: Array.isArray(s.lastMutators) ? s.lastMutators : [],
  };
}
