export interface JoystickState {
  moveX: number;
  moveY: number;
  active: boolean;
}

export class VirtualJoystick {
  private active = false;
  private originX = 0;
  private originY = 0;
  private moveX = 0;
  private moveY = 0;
  private maxRadius = 48;
  private knob: HTMLElement;

  constructor(private zone: HTMLElement) {
    this.zone.classList.add("joystick-active");
    this.knob = document.createElement("div");
    this.knob.className = "joystick-knob";
    this.zone.appendChild(this.knob);

    zone.addEventListener("pointerdown", this.onDown);
    zone.addEventListener("pointermove", this.onMove);
    zone.addEventListener("pointerup", this.onUp);
    zone.addEventListener("pointercancel", this.onUp);
  }

  private onDown = (e: PointerEvent) => {
    this.zone.setPointerCapture(e.pointerId);
    const rect = this.zone.getBoundingClientRect();
    this.originX = rect.left + rect.width / 2;
    this.originY = rect.top + rect.height / 2;
    this.active = true;
    this.zone.classList.add("joystick-pressed");
    this.update(e.clientX, e.clientY);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.active) return;
    this.update(e.clientX, e.clientY);
  };

  private onUp = () => {
    this.active = false;
    this.moveX = 0;
    this.moveY = 0;
    this.zone.classList.remove("joystick-pressed");
    this.knob.style.transform = "translate(-50%, -50%)";
  };

  private update(cx: number, cy: number) {
    let dx = cx - this.originX;
    let dy = cy - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > this.maxRadius) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    // Dead-zone: small finger jitter near the centre shouldn't move the player.
    const DEAD = 0.18;
    let nx = dx / this.maxRadius;
    let ny = dy / this.maxRadius;
    const nlen = Math.hypot(nx, ny);
    if (nlen < DEAD) {
      nx = 0;
      ny = 0;
    } else {
      // Re-scale so values just past DEAD start at 0 (smooth ramp).
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
    this.zone.removeEventListener("pointerdown", this.onDown);
    this.zone.removeEventListener("pointermove", this.onMove);
    this.zone.removeEventListener("pointerup", this.onUp);
    this.zone.removeEventListener("pointercancel", this.onUp);
    this.knob.remove();
    this.zone.classList.remove("joystick-active", "joystick-pressed");
  }
}
