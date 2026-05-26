import { loadKeyBindings, type GameAction } from "./keyBindings";

/** Maps DOM `KeyboardEvent.code` strings, configurable via key bindings. */
export class KeyboardInput {
  private keys = new Set<string>();
  private bindings = loadKeyBindings();
  private boundActions = new Set<GameAction>();

  constructor() {
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
  }

  refreshBindings() {
    this.bindings = loadKeyBindings();
    this.boundActions.clear();
  }

  private onDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    const swallow: GameAction[] = ["domain", "dash", "pause", "menu", "ping", "ultimate"];
    for (const action of swallow) {
      if (this.bindings[action]?.includes(e.code)) e.preventDefault();
    }
  };

  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  /** Movement vector from currently-held movement keys */
  getVector(): { moveX: number; moveY: number; aimAngle: number } {
    let x = 0;
    let y = 0;
    if (this.codesHeld(this.bindings.up)) y -= 1;
    if (this.codesHeld(this.bindings.down)) y += 1;
    if (this.codesHeld(this.bindings.left)) x -= 1;
    if (this.codesHeld(this.bindings.right)) x += 1;
    const len = Math.hypot(x, y);
    if (len > 0) {
      return {
        moveX: x / len,
        moveY: y / len,
        aimAngle: Math.atan2(y, x),
      };
    }
    return { moveX: 0, moveY: 0, aimAngle: 0 };
  }

  /** Returns true the first time any code bound to `action` was pressed since last consumed */
  consumeAction(action: GameAction): boolean {
    const codes = this.bindings[action] ?? [];
    const held = codes.some((c) => this.keys.has(c));
    if (held && !this.boundActions.has(action)) {
      this.boundActions.add(action);
      return true;
    }
    if (!held) this.boundActions.delete(action);
    return false;
  }

  /** Raw "is this physical key down" check for back-compat with older callers */
  isPressed(code: string): boolean {
    return this.keys.has(code);
  }

  /** True if any of the given codes are currently held */
  private codesHeld(codes: string[]): boolean {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  destroy() {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    this.keys.clear();
    this.boundActions.clear();
  }
}
