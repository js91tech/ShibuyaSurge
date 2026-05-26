import Phaser from "phaser";
import type { AmbienceConfig, StageDef } from "@jjk/game-core";

/**
 * One ambient particle. Position is in *screen-space* relative to the
 * camera centre so the effect always covers the viewport regardless of
 * world scroll; the per-frame `update` re-projects.
 */
interface AmbienceParticle {
  /** Phaser game object — a tiny ellipse / rectangle depending on kind. */
  obj: Phaser.GameObjects.GameObject & { setPosition: (x: number, y: number) => void };
  /** Velocity in screen-space px/sec. */
  vx: number;
  vy: number;
  /** Lifetime tracker — when ≥ 1, respawn at the top of the screen. */
  age: number;
  /** Random size so particles don't all look identical. */
  size: number;
  /** Slight rotation drift, used by leaves/confetti. */
  rot: number;
  rotV: number;
}

/**
 * Arena background — tiled JJK floor texture + mood tint.
 *
 * Layers (back → front):
 *   depth −101  solid fallback rectangle (in case the texture hasn't loaded)
 *   depth −100  TileSprite of `arena_floor`, sized to the camera viewport,
 *               world-anchored via `tilePosition` so the floor pans with you
 *   depth  −99  flat mood tint that gently colours the floor for boss/domain
 *
 * Everything is positioned in world coords around the camera centre — no
 * `setScrollFactor(0)` gymnastics, no per-frame Graphics rebuilds, nothing
 * that has historically glitched at non-1 zoom.
 */
export class ArenaBackground {
  private scene: Phaser.Scene;
  private fallback: Phaser.GameObjects.Rectangle;
  private tile: Phaser.GameObjects.TileSprite | null = null;
  /** Stage-driven base floor tint (always on, very subtle). */
  private stageTint: Phaser.GameObjects.Rectangle;
  /** Boss / domain mood tint (transient, swaps on phase change). */
  private tint: Phaser.GameObjects.Rectangle;
  private bossActive = false;
  private domainActive = false;
  private stage: StageDef | undefined;
  private currentTextureKey: string | null = null;
  /** Ambient particle layer — populated lazily when the stage requests it. */
  private ambient: AmbienceParticle[] = [];
  private ambientKind: AmbienceConfig["kind"] = "none";
  private ambientColor = 0xffffff;
  /** Last camera dimensions, captured for respawning particles off-screen. */
  private camW = 1280;
  private camH = 720;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.fallback = scene.add.rectangle(0, 0, 8000, 8000, 0x05060e).setDepth(-101);

    if (scene.textures.exists("arena_floor")) {
      this.tile = scene.add
        .tileSprite(0, 0, 4000, 4000, "arena_floor")
        .setDepth(-100)
        .setAlpha(0.95);
      // Each source texture is ~1536x1024; scaling the *tile* by 1.6 makes
      // one repeat ~2400x1600 — comfortably larger than any plausible
      // viewport so the seam between repeats is rarely on-screen, which
      // hides the fact that the AI-generated floors aren't perfectly
      // seamless. We also use linear filtering already, so the scale-up
      // stays crisp.
      this.tile.setTileScale(1.6);
      this.currentTextureKey = "arena_floor";
    }

    // Stage tint (rarely changes) and mood tint (boss/domain) are two
    // separate rectangles so we can author them independently and avoid
    // re-creating GameObjects when the stage stays the same.
    this.stageTint = scene.add.rectangle(0, 0, 8000, 8000, 0x000000, 0).setDepth(-99.5);
    this.tint = scene.add.rectangle(0, 0, 8000, 8000, 0x000000, 0).setDepth(-99);
    this.applyMood();
  }

  setStage(stage: StageDef | undefined) {
    this.stage = stage;
    // Swap the tile texture to the stage-specific floor when available.
    // Falls back to the legacy `arena_floor` for stages still using a tint
    // over the base texture (and for stage-less modes like Daily / Practice).
    const desiredKey = stage?.floorTexture ?? "arena_floor";
    if (desiredKey !== this.currentTextureKey && this.scene.textures.exists(desiredKey)) {
      if (this.tile) {
        this.tile.setTexture(desiredKey);
        // Re-assert tile scale — `setTexture` resets some derived state.
        this.tile.setTileScale(1.6);
      } else {
        this.tile = this.scene.add
          .tileSprite(0, 0, 4000, 4000, desiredKey)
          .setDepth(-100)
          .setAlpha(0.95);
        this.tile.setTileScale(1.6);
      }
      this.currentTextureKey = desiredKey;
    }
    if (stage) {
      this.stageTint.setFillStyle(stage.floorTint, stage.floorAlpha);
    } else {
      this.stageTint.setFillStyle(0x000000, 0);
    }
    this.rebuildAmbience(stage?.ambience);
    // Re-apply mood so any stage-specific boss/domain palette swap takes hold.
    this.applyMood();
  }

  /**
   * Tear down the existing ambient particle pool and build a new one to
   * match the active stage. Particle counts are deliberately small (≤ 70)
   * so even on mobile we add < 1 ms per frame.
   */
  private rebuildAmbience(cfg: AmbienceConfig | undefined) {
    for (const p of this.ambient) p.obj.destroy();
    this.ambient = [];
    if (!cfg || cfg.kind === "none" || cfg.density <= 0) {
      this.ambientKind = "none";
      return;
    }
    this.ambientKind = cfg.kind;
    this.ambientColor = cfg.color;
    const count = Math.floor(20 + 50 * Math.max(0, Math.min(1, cfg.density)));
    for (let i = 0; i < count; i++) this.ambient.push(this.spawnParticle(true));
  }

  /**
   * Construct a single particle. When `initial` is true the y position is
   * spread across the whole viewport so the first frame is already full
   * of ambience; otherwise it spawns above the top edge.
   */
  private spawnParticle(initial: boolean): AmbienceParticle {
    const scene = this.scene;
    const cx = 0;
    const cy = 0;
    const w = this.camW;
    const h = this.camH;
    const size = 2 + Math.random() * 5;
    const x = cx + (Math.random() - 0.5) * w * 1.1;
    const y = initial
      ? cy + (Math.random() - 0.5) * h * 1.1
      : cy - h / 2 - 20 - Math.random() * 80;

    let obj: AmbienceParticle["obj"];
    let vx = 0;
    let vy = 0;
    let rotV = 0;
    switch (this.ambientKind) {
      case "neon_rain": {
        const r = scene.add
          .rectangle(x, y, 1.5, size * 5, this.ambientColor, 0.5)
          .setDepth(-98)
          .setBlendMode(Phaser.BlendModes.ADD);
        obj = r;
        vx = -30 + Math.random() * 10;
        vy = 320 + Math.random() * 180;
        break;
      }
      case "dust": {
        const e = scene.add
          .ellipse(x, y, size * 1.4, size, this.ambientColor, 0.15)
          .setDepth(-98);
        obj = e;
        vx = (Math.random() - 0.5) * 12;
        vy = 8 + Math.random() * 18;
        break;
      }
      case "leaves": {
        const tri = scene.add
          .triangle(
            x,
            y,
            0,
            size * 1.6,
            size * 1.4,
            0,
            size * 1.6,
            size * 1.5,
            this.ambientColor
          )
          .setDepth(-98)
          .setAlpha(0.6);
        obj = tri;
        vx = -20 + (Math.random() - 0.5) * 50;
        vy = 30 + Math.random() * 40;
        rotV = (Math.random() - 0.5) * 1.6;
        break;
      }
      case "confetti": {
        const r = scene.add
          .rectangle(x, y, size, size * 0.55, this.ambientColor)
          .setDepth(-98)
          .setAlpha(0.85);
        obj = r;
        vx = (Math.random() - 0.5) * 80;
        vy = 70 + Math.random() * 60;
        rotV = (Math.random() - 0.5) * 4;
        break;
      }
      default: {
        const e = scene.add.ellipse(x, y, size, size, this.ambientColor, 0.4).setDepth(-98);
        obj = e;
        break;
      }
    }
    return { obj, vx, vy, age: 0, size, rot: 0, rotV };
  }

  setBossActive(on: boolean) {
    if (this.bossActive === on) return;
    this.bossActive = on;
    this.applyMood();
  }

  setDomainActive(on: boolean) {
    if (this.domainActive === on) return;
    this.domainActive = on;
    this.applyMood();
  }

  /** Re-anchor every layer around the camera centre each frame. */
  update(camera: Phaser.Cameras.Scene2D.Camera, dt = 1 / 60) {
    const cx = camera.scrollX + camera.width / 2;
    const cy = camera.scrollY + camera.height / 2;
    this.camW = camera.width;
    this.camH = camera.height;
    this.fallback.setPosition(cx, cy);
    this.stageTint.setPosition(cx, cy);
    this.tint.setPosition(cx, cy);
    if (this.tile) {
      this.tile.setPosition(cx, cy);
      // Anchor the floor 1:1 with world coords (no parallax drift). With
      // tileScale=1.6 and pure 1:1 movement the floor feels like a real
      // ground plane rather than sliding under the player, and the seams
      // between repeats stay further apart from the visible viewport.
      this.tile.tilePositionX = camera.scrollX / this.tile.tileScaleX;
      this.tile.tilePositionY = camera.scrollY / this.tile.tileScaleY;
    }
    this.tickAmbience(cx, cy, dt);
  }

  /**
   * Advance the ambient particle pool. Particles live in screen space and
   * recycle when they leave the viewport — cheap and frame-rate stable.
   */
  private tickAmbience(cx: number, cy: number, dt: number) {
    if (!this.ambient.length) return;
    const halfH = this.camH / 2 + 40;
    const halfW = this.camW / 2 + 60;
    for (const p of this.ambient) {
      // Mutate the wrapped game object's position; we cast because the
      // base GameObject typing doesn't include x/y but every concrete
      // type we instantiate does (Rectangle / Ellipse / Triangle).
      const node = p.obj as unknown as { x: number; y: number; rotation?: number };
      node.x += p.vx * dt;
      node.y += p.vy * dt;
      if (p.rotV !== 0) {
        p.rot += p.rotV * dt;
        node.rotation = p.rot;
      }
      // Drift relative to camera so when the player moves, ambience moves
      // softly with the world (instead of being glued to the camera).
      const dx = node.x - cx;
      const dy = node.y - cy;
      if (dy > halfH || dx > halfW || dx < -halfW) {
        // Recycle: respawn at top of viewport at a new random x.
        node.x = cx + (Math.random() - 0.5) * this.camW * 1.1;
        node.y = cy - halfH;
      }
    }
  }

  private applyMood() {
    const bossTint = this.stage?.bossTint ?? 0x7f1d1d;
    const domainTint = this.stage?.domainTint ?? 0x4c1d95;
    if (this.domainActive) {
      this.tint.setFillStyle(domainTint, 0.45);
    } else if (this.bossActive) {
      this.tint.setFillStyle(bossTint, 0.32);
    } else {
      this.tint.setFillStyle(0x05060e, 0.18);
    }
  }

  destroy() {
    this.fallback.destroy();
    this.tile?.destroy();
    this.stageTint.destroy();
    this.tint.destroy();
    for (const p of this.ambient) p.obj.destroy();
    this.ambient = [];
  }
}
