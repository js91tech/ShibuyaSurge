export interface JoystickState {
  moveX: number;
  moveY: number;
  active: boolean;
}

const IGNORE_SELECTOR =
  "button, a, input, textarea, select, label, [role='button'], .tech-chip, .draft-card, .draft-overlay, .tech-detail-overlay, .pause-menu, .quit-confirm, .shop-modal, .settings-panel, .lobby-overlay";

export interface VirtualJoystickOptions {
  largeTouch?: boolean;
}

/**
 * Floating joystick — touch or drag anywhere on the playfield (not HUD buttons).
 * Uses document-level touch + pointer capture so the Phaser canvas cannot block input.
 */
export class VirtualJoystick {
  private active = false;
  private touchPointer = false;
  private touchId = -1;
  private pointerId = -1;
  private originX = 0;
  private originY = 0;
  private moveX = 0;
  private moveY = 0;
  private maxRadius = 48;
  private stickSize = 112;
  private readonly stick: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly measureEl: HTMLElement;
  private readonly captureOpts = { capture: true, passive: false } as const;

  constructor(opts: VirtualJoystickOptions = {}) {
    document.documentElement.classList.add("floating-joystick-active");
    if (opts.largeTouch) {
      document.documentElement.classList.add("joystick-large-touch");
    }

    this.measureEl = document.createElement("div");
    this.measureEl.className = "joystick-stick joystick-zone joystick-active";
    this.measureEl.setAttribute("data-measure", "1");
    this.measureEl.style.cssText =
      "position:fixed;left:-9999px;visibility:hidden;pointer-events:none;";
    document.body.appendChild(this.measureEl);

    this.stick = document.createElement("div");
    this.stick.className = "joystick-stick joystick-zone joystick-active";
    this.stick.style.visibility = "hidden";
    this.stick.style.opacity = "0";
    document.body.appendChild(this.stick);

    this.knob = document.createElement("div");
    this.knob.className = "joystick-knob";
    this.stick.appendChild(this.knob);

    this.syncStickSize();

    document.addEventListener("touchstart", this.onTouchStart, this.captureOpts);
    document.addEventListener("touchmove", this.onTouchMove, this.captureOpts);
    document.addEventListener("touchend", this.onTouchEnd, this.captureOpts);
    document.addEventListener("touchcancel", this.onTouchEnd, this.captureOpts);
    document.addEventListener("pointerdown", this.onPointerDown, this.captureOpts);
    document.addEventListener("pointermove", this.onPointerMove, this.captureOpts);
    document.addEventListener("pointerup", this.onPointerUp, this.captureOpts);
    document.addEventListener("pointercancel", this.onPointerUp, this.captureOpts);
  }

  private syncStickSize(): void {
    const side = this.measureEl.offsetWidth;
    this.stickSize = side > 0 ? side : 112;
    this.maxRadius = Math.max(28, this.stickSize * 0.38);
  }

  private inActiveRun(x: number, y: number): boolean {
    const shell = document.querySelector(".app-shell.in-run");
    if (!shell) return false;
    const r = shell.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  private shouldIgnoreAt(x: number, y: number): boolean {
    if (!this.inActiveRun(x, y)) return true;
    const el = document.elementFromPoint(x, y);
    if (!el) return true;
    return !!el.closest(IGNORE_SELECTOR);
  }

  private placeStick(clientX: number, clientY: number): void {
    const half = this.stickSize / 2;
    this.stick.style.width = `${this.stickSize}px`;
    this.stick.style.height = `${this.stickSize}px`;
    this.stick.style.left = `${clientX - half}px`;
    this.stick.style.top = `${clientY - half}px`;
    this.originX = clientX;
    this.originY = clientY;
  }

  private beginDrag(clientX: number, clientY: number): void {
    this.syncStickSize();
    this.placeStick(clientX, clientY);
    this.active = true;
    this.stick.classList.add("joystick-visible", "joystick-pressed");
    this.stick.style.visibility = "visible";
    this.stick.style.opacity = "1";
    this.update(clientX, clientY);
  }

  private endDrag(): void {
    this.active = false;
    this.touchPointer = false;
    this.touchId = -1;
    this.pointerId = -1;
    this.moveX = 0;
    this.moveY = 0;
    this.stick.classList.remove("joystick-visible", "joystick-pressed");
    this.stick.style.visibility = "hidden";
    this.stick.style.opacity = "0";
    this.knob.style.transform = "translate(-50%, -50%)";
  }

  private onTouchStart = (e: TouchEvent) => {
    if (this.active || e.touches.length === 0) return;
    const t = e.changedTouches[0];
    if (!t || this.shouldIgnoreAt(t.clientX, t.clientY)) return;

    this.touchPointer = true;
    this.touchId = t.identifier;
    this.beginDrag(t.clientX, t.clientY);
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.active || !this.touchPointer) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== this.touchId) continue;
      this.update(t.clientX, t.clientY);
      e.preventDefault();
      return;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (!this.active || !this.touchPointer) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.endDrag();
        e.preventDefault();
        return;
      }
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.active || e.button !== 0) return;
    if (e.pointerType === "touch" && this.touchPointer) return;
    if (this.shouldIgnoreAt(e.clientX, e.clientY)) return;

    this.pointerId = e.pointerId;
    this.beginDrag(e.clientX, e.clientY);
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.active) return;
    if (this.touchPointer) return;
    if (e.pointerId !== this.pointerId) return;
    this.update(e.clientX, e.clientY);
    e.preventDefault();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.active) return;
    if (this.touchPointer) return;
    if (e.pointerId !== this.pointerId) return;
    this.endDrag();
  };

  private update(cx: number, cy: number) {
    let dx = cx - this.originX;
    let dy = cy - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > this.maxRadius) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    const DEAD = 0.15;
    let nx = dx / this.maxRadius;
    let ny = dy / this.maxRadius;
    const nlen = Math.hypot(nx, ny);
    if (nlen < DEAD) {
      nx = 0;
      ny = 0;
    } else {
      const s = (nlen - DEAD) / (1 - DEAD) / nlen;
      nx *= s;
      ny *= s;
    }
    this.moveX = nx;
    this.moveY = ny;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  getState(): JoystickState {
    return { moveX: this.moveX, moveY: this.moveY, active: this.active };
  }

  destroy() {
    document.removeEventListener("touchstart", this.onTouchStart, this.captureOpts);
    document.removeEventListener("touchmove", this.onTouchMove, this.captureOpts);
    document.removeEventListener("touchend", this.onTouchEnd, this.captureOpts);
    document.removeEventListener("touchcancel", this.onTouchEnd, this.captureOpts);
    document.removeEventListener("pointerdown", this.onPointerDown, this.captureOpts);
    document.removeEventListener("pointermove", this.onPointerMove, this.captureOpts);
    document.removeEventListener("pointerup", this.onPointerUp, this.captureOpts);
    document.removeEventListener("pointercancel", this.onPointerUp, this.captureOpts);
    this.knob.remove();
    this.stick.remove();
    this.measureEl.remove();
    document.documentElement.classList.remove(
      "floating-joystick-active",
      "joystick-large-touch"
    );
  }
}
