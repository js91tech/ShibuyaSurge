import type { CharacterId } from "@jjk/game-core";

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  particles: "low" | "medium" | "high";
  showFps: boolean;
  showTips: boolean;
  showRunStats: boolean;
  autoPickUpgrade: boolean;
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
}

const KEY = "jjk_settings";

export const DEFAULT_SETTINGS: GameSettings = {
  // Music defaults low — the procedural pad is meant as a bed, not the
  // foreground; players can boost it from the settings panel.
  musicVolume: 0.3,
  sfxVolume: 0.8,
  particles: "medium",
  showFps: false,
  showTips: true,
  showRunStats: false,
  autoPickUpgrade: false,
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
