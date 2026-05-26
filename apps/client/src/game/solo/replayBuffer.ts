/**
 * Ring buffer of compact snapshots used for the death-replay panel on
 * Results (Tier 2 #9) and the JSON export button (Tier 5 #18).
 *
 * Each frame stores only what the renderer needs to *play back* the last few
 * seconds of action — player position, enemies (positions + hp), and live
 * projectiles. We avoid stashing the full SoloSnapshot because that would
 * blow out memory quickly at 20 Hz.
 */

import type { ProjectileKind } from "./SoloEngine";

export interface ReplayFrame {
  t: number;
  player: { x: number; y: number; hp: number };
  enemies: Array<{ id: string; x: number; y: number; hp: number; boss: boolean; elite: boolean }>;
  projectiles: Array<{ id: string; kind: ProjectileKind; x: number; y: number; angle: number }>;
}

export interface ReplayExport {
  characterId: string;
  exorcisms: number;
  durationSec: number;
  frames: ReplayFrame[];
  finalGrade: string;
  capturedAt: number;
}

export class ReplayBuffer {
  private frames: ReplayFrame[] = [];
  private cap: number;
  private hz: number;
  private lastT = -Infinity;

  /** `seconds` controls how much history to keep; `hz` how often to sample. */
  constructor(seconds = 4, hz = 20) {
    this.hz = hz;
    this.cap = Math.ceil(seconds * hz);
  }

  push(frame: ReplayFrame): void {
    if (frame.t - this.lastT < 1 / this.hz) return;
    this.lastT = frame.t;
    this.frames.push(frame);
    if (this.frames.length > this.cap) {
      this.frames.shift();
    }
  }

  clear(): void {
    this.frames = [];
    this.lastT = -Infinity;
  }

  /** Snapshot the buffer for downstream rendering or export. */
  toArray(): ReplayFrame[] {
    return this.frames.slice();
  }
}
