export type GameAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "domain"
  | "dash"
  | "pause"
  | "menu"
  | "ping"
  | "ultimate";

export type KeyBindings = Record<GameAction, string[]>;

export const DEFAULT_BINDINGS: KeyBindings = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  domain: ["KeyQ"],
  dash: ["ShiftLeft"],
  pause: ["KeyP"],
  menu: ["Escape"],
  ping: ["KeyV"],
  ultimate: ["KeyE"],
};

const STORAGE_KEY = "jjk_keybindings";

export function loadKeyBindings(): KeyBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneBindings(DEFAULT_BINDINGS);
    const stored = JSON.parse(raw) as Partial<KeyBindings>;
    const merged: KeyBindings = cloneBindings(DEFAULT_BINDINGS);
    for (const key of Object.keys(DEFAULT_BINDINGS) as GameAction[]) {
      const v = stored[key];
      if (Array.isArray(v) && v.length) merged[key] = v.slice(0, 2);
    }
    return merged;
  } catch {
    return cloneBindings(DEFAULT_BINDINGS);
  }
}

export function saveKeyBindings(bindings: KeyBindings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function resetKeyBindings(): KeyBindings {
  const fresh = cloneBindings(DEFAULT_BINDINGS);
  saveKeyBindings(fresh);
  return fresh;
}

function cloneBindings(src: KeyBindings): KeyBindings {
  return {
    up: [...src.up],
    down: [...src.down],
    left: [...src.left],
    right: [...src.right],
    domain: [...src.domain],
    dash: [...src.dash],
    pause: [...src.pause],
    menu: [...src.menu],
    ping: [...src.ping],
    ultimate: [...(src.ultimate ?? ["KeyE"])],
  };
}

/** Human-readable key labels — handles common DOM `code` values */
export function keyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return `↑↓←→`[["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(code)] ?? code;
  if (code === "Space") return "Space";
  if (code === "Escape") return "Esc";
  return code;
}

export const ACTION_LABELS: Record<GameAction, string> = {
  up: "Move up",
  down: "Move down",
  left: "Move left",
  right: "Move right",
  domain: "Domain Expansion",
  dash: "Dash",
  pause: "Pause",
  menu: "Menu / cancel",
  ping: "Ping wheel",
  ultimate: "Ultimate",
};
