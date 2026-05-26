import Phaser from "phaser";
import type { SoloProjectile, ProjectileKind } from "../solo/SoloEngine";

/**
 * Manages a pool of Phaser sprites mirroring SoloEngine.projectiles. Sprites
 * are recycled per-kind and animated (rotation / scale pulse) based on the
 * projectile's remaining life.
 */
const TEXTURE_FOR: Record<ProjectileKind, string> = {
  hammer: "proj_hammer",
  nail: "proj_nail",
  dog: "proj_dog",
  nue: "proj_nue",
  fist: "proj_fist",
  blue: "proj_blue",
  red: "proj_red",
  beam: "proj_beam",
  // Maki
  spear: "proj_spear",
  kunai: "proj_kunai",
  slash_wave: "proj_slash_wave",
  cleaver_arc: "proj_cleaver_arc",
  // Toge
  speech_ring: "proj_speech_ring",
  sigil: "proj_sigil",
  forbidden_word: "proj_forbidden_word",
  // Yuta
  katana_arc: "proj_katana_arc",
  rika_fist: "proj_rika_fist",
  mini_rika: "proj_mini_rika",
  love_beam_seg: "proj_love_beam",
  // Nobara
  embed_nail: "proj_embed_nail",
  floating_doll: "proj_floating_doll",
  nail_rupture: "proj_nail_rupture",
  // Megumi
  dash_wolf: "proj_dash_wolf",
  shadow_frog: "proj_shadow_frog",
  shadow_pool: "proj_shadow_pool",
  shadow_beast: "proj_shadow_beast",
  // Gojo
  purple_orb: "proj_purple_orb",
  void_eye: "proj_void_eye",
  // Yuji
  divergent_impact: "proj_divergent_impact",
  kick_wave: "proj_kick_wave",
  black_flash_crack: "proj_black_flash_crack",
};

const TINT_FOR: Partial<Record<ProjectileKind, number>> = {
  hammer: 0xfb7185,
  nail: 0xfde68a,
  blue: 0x60a5fa,
  red: 0xef4444,
  beam: 0xc084fc,
  fist: 0xff6b4a,
  // Maki — dark green / steel curse energy.
  spear: 0xa7f3d0,
  kunai: 0x6ee7b7,
  slash_wave: 0x34d399,
  cleaver_arc: 0xd1fae5,
  // Toge — violet / white.
  speech_ring: 0xede9fe,
  sigil: 0xc4b5fd,
  forbidden_word: 0xffffff,
  // Yuta — cyan / black.
  katana_arc: 0x67e8f9,
  rika_fist: 0x22d3ee,
  mini_rika: 0xa5f3fc,
  love_beam_seg: 0xcffafe,
  // Nobara — rusted red + black.
  embed_nail: 0xfca5a5,
  floating_doll: 0xfecaca,
  nail_rupture: 0xb91c1c,
  // Megumi — navy + blue eye-glow.
  dash_wolf: 0x60a5fa,
  shadow_frog: 0x1e3a8a,
  shadow_pool: 0x1e1b4b,
  shadow_beast: 0x312e81,
  // Gojo — cyan + violet (Hollow Purple).
  purple_orb: 0xc084fc,
  void_eye: 0x67e8f9,
  // Yuji — red + black + white spatial cracks.
  divergent_impact: 0xff6b4a,
  kick_wave: 0xfca5a5,
  black_flash_crack: 0xffffff,
};

export class ProjectileRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private pool: Phaser.GameObjects.Sprite[] = [];

  constructor(private scene: Phaser.Scene) {}

  sync(projectiles: SoloProjectile[]) {
    const seen = new Set<string>();
    for (const p of projectiles) {
      seen.add(p.id);
      let spr = this.sprites.get(p.id);
      if (!spr) {
        spr = this.acquire(p.kind);
        this.sprites.set(p.id, spr);
      }
      spr.setPosition(p.x, p.y);
      spr.setRotation(p.angle);
      const tint = TINT_FOR[p.kind];
      if (tint !== undefined) spr.setTint(tint);
      else spr.clearTint();

      // Per-kind animation tweaks
      const t = this.scene.time.now;
      if (p.kind === "dog") {
        spr.setScale(1.1 + Math.sin(t * 0.012 + p.x) * 0.12);
        spr.setAlpha(1);
      } else if (p.kind === "hammer") {
        spr.setRotation(p.angle + t * 0.02);
        spr.setScale(1);
      } else if (p.kind === "beam") {
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setAlpha(0.55 + 0.45 * fade);
        spr.setScale(1, 1.2 + Math.sin(t * 0.04 + p.x * 0.01) * 0.4);
      } else if (p.kind === "blue") {
        spr.setScale(1 + Math.sin(t * 0.02 + p.x) * 0.2);
        spr.setRotation(p.angle + t * 0.01);
      } else if (p.kind === "red") {
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(1.3 - fade * 0.6, 1);
        spr.setAlpha(0.4 + fade * 0.6);
      } else if (p.kind === "nue") {
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(1.4 - fade * 0.4);
        spr.setAlpha(0.6 + fade * 0.4);
      } else if (p.kind === "fist") {
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(0.7 + (1 - fade) * 0.6);
        spr.setAlpha(0.4 + fade * 0.6);
      } else if (p.kind === "spear") {
        // Maki spear — rotate with motion, gentle scale pulse on the return
        // stroke for the "shockwave" visual.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const returned = fade < 0.5; // boomerang flips at lifeMax/2
        spr.setScale(returned ? 1.15 : 1, 1);
        spr.setAlpha(0.85 + (returned ? 0.15 : 0));
      } else if (p.kind === "kunai") {
        spr.setScale(1);
        spr.setAlpha(1);
      } else if (p.kind === "slash_wave") {
        // Invisible-but-deadly slashes: keep alpha low so it reads as a
        // ghost arc. Scale up as it ages so it feels like a sweeping cut.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setAlpha(0.18 + 0.42 * fade);
        spr.setScale(0.7 + (1 - fade) * 0.9);
      } else if (p.kind === "cleaver_arc") {
        // Dragon-Bone Cleaver — big sweeping crescent.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(1.1 + (1 - fade) * 0.4);
        spr.setAlpha(0.6 + fade * 0.4);
      } else if (p.kind === "speech_ring") {
        // Concentric rings that expand outward — visually grow with life.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(0.7 + (1 - fade) * 1.6);
        spr.setAlpha(fade);
        spr.setRotation(t * 0.004);
      } else if (p.kind === "sigil") {
        // Sigils pulse while delayed, then settle when active.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const delayed = (p as { delay?: number }).delay && (p as { delay?: number }).delay! > 0;
        spr.setScale(delayed ? 1 + Math.sin(t * 0.02) * 0.18 : 1.2);
        spr.setAlpha(delayed ? 0.85 : 0.5 + fade * 0.5);
        spr.setRotation(delayed ? t * 0.006 : 0);
      } else if (p.kind === "forbidden_word") {
        // Battlefield kanji — appear, slam, fade out.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const delayed = (p as { delay?: number }).delay && (p as { delay?: number }).delay! > 0;
        spr.setScale(delayed ? 1 + Math.sin(t * 0.015) * 0.12 : 1.4 - fade * 0.4);
        spr.setAlpha(delayed ? 0.7 : 0.5 + fade * 0.5);
      } else if (p.kind === "katana_arc") {
        // Sharp crescent — slight rotation pulse so it reads as a flash.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(0.9 + (1 - fade) * 0.4);
        spr.setAlpha(0.7 + fade * 0.3);
      } else if (p.kind === "rika_fist") {
        // Big lumbering Rika fist — slow rotation for menace.
        spr.setRotation(p.angle + t * 0.005);
        spr.setScale(1);
        spr.setAlpha(0.95);
      } else if (p.kind === "mini_rika") {
        // Mini Rika bite — bobs and shrinks slightly as it homes.
        spr.setScale(1 + Math.sin(t * 0.02 + p.x) * 0.15);
        spr.setAlpha(0.95);
      } else if (p.kind === "love_beam_seg") {
        // Beam segments stretch out and hot-fade — keep them blazing.
        const fade = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(1, 1.2 + Math.sin(t * 0.04 + p.x * 0.01) * 0.5);
        spr.setAlpha(0.6 + fade * 0.4);
      } else if (p.kind === "embed_nail") {
        // Nail orientation matches travel direction. After embedding the
        // velocity is zero — render it locked at its angle with a small
        // cursed-energy pulse to telegraph the upcoming detonation.
        spr.setRotation(p.angle);
        const embedded = p.vx === 0 && p.vy === 0;
        if (embedded) {
          spr.setScale(1 + Math.sin(t * 0.025) * 0.18);
          spr.setAlpha(0.85 + Math.sin(t * 0.04) * 0.15);
        } else {
          spr.setScale(1);
          spr.setAlpha(1);
        }
      } else if (p.kind === "floating_doll") {
        // Doll orbits the player — gentle bobbing and slow spin.
        spr.setRotation(Math.sin(t * 0.002 + p.x) * 0.4);
        spr.setScale(1 + Math.sin(t * 0.006 + p.y * 0.01) * 0.08);
        spr.setAlpha(0.95);
      } else if (p.kind === "nail_rupture") {
        // Black-red rupture — punch in fast, fade out slowly.
        const life = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const grow = 0.5 + (1 - life) * 0.9;
        spr.setScale(grow);
        spr.setAlpha(0.4 + life * 0.6);
      } else if (p.kind === "dash_wolf") {
        // Dashing wolves rotate to face their velocity vector. Subtle
        // stretch on the long axis for a "lunging" feel.
        const a = Math.atan2(p.vy, p.vx);
        spr.setRotation(a);
        spr.setScale(1.15, 0.95);
        spr.setAlpha(0.95);
      } else if (p.kind === "shadow_frog") {
        // Frog hops in place — vertical bob + alpha flicker.
        const life = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setScale(1 + Math.sin(t * 0.01) * 0.15, 1 - Math.sin(t * 0.01) * 0.1);
        spr.setAlpha(0.6 + life * 0.4);
      } else if (p.kind === "shadow_pool") {
        // Static slow-zone — gentle pulse + low alpha so allies can see.
        spr.setScale(1 + Math.sin(t * 0.004) * 0.05);
        spr.setAlpha(0.55 + Math.sin(t * 0.006) * 0.1);
        spr.setRotation(t * 0.0005);
      } else if (p.kind === "shadow_beast") {
        // Giant beast — slow heavy lurch, stronger scale modulation.
        spr.setRotation(Math.sin(t * 0.003) * 0.2);
        spr.setScale(1.1 + Math.sin(t * 0.005) * 0.1);
        spr.setAlpha(0.95);
      } else if (p.kind === "purple_orb") {
        // Hollow Purple — spinning aura, slight pulse from violet → cyan.
        spr.setRotation(t * 0.012);
        spr.setScale(1.1 + Math.sin(t * 0.01) * 0.1);
        spr.setAlpha(0.95);
      } else if (p.kind === "void_eye") {
        // Cosmic eye — slow rotation + heavy bob, ramps up alpha as the
        // delay countdown reaches zero (no direct access to delay here,
        // so we ride lifeMax fraction).
        const life = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        spr.setRotation(t * 0.0007);
        spr.setScale(1 + (1 - life) * 0.3);
        spr.setAlpha(0.85 + (1 - life) * 0.15);
      } else if (p.kind === "divergent_impact") {
        // Delayed impact glyph — fast pop-in scale, white-hot fade.
        const life = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const grow = 0.45 + (1 - life) * 1.0;
        spr.setRotation(p.angle + t * 0.01);
        spr.setScale(grow);
        spr.setAlpha(0.5 + life * 0.5);
      } else if (p.kind === "kick_wave") {
        // Spinning kick crescent — rotate aggressively in travel direction.
        spr.setRotation(p.angle + t * 0.02);
        spr.setScale(1.15);
        spr.setAlpha(0.95);
      } else if (p.kind === "black_flash_crack") {
        // White spatial crack — pop in, hold, fade fast.
        const life = Math.max(0, p.life / Math.max(0.001, p.lifeMax));
        const grow = 0.6 + (1 - life) * 0.8;
        spr.setRotation(p.angle + Math.sin(t * 0.05) * 0.1);
        spr.setScale(grow);
        spr.setAlpha(life > 0.6 ? 1 : life / 0.6);
      } else {
        spr.setScale(1);
        spr.setAlpha(1);
      }
      // Big Shots (passive) — uniformly scales projectiles up so the visuals
      // match the larger collision circle.
      if (p.radiusMul && p.radiusMul !== 1) {
        spr.setScale(spr.scaleX * p.radiusMul, spr.scaleY * p.radiusMul);
      }
    }
    for (const [id, spr] of this.sprites) {
      if (!seen.has(id)) {
        this.release(spr);
        this.sprites.delete(id);
      }
    }
  }

  private acquire(kind: ProjectileKind): Phaser.GameObjects.Sprite {
    const tex = TEXTURE_FOR[kind];
    const reuse = this.pool.pop();
    if (reuse) {
      reuse.setTexture(tex);
      reuse.setActive(true).setVisible(true).clearTint();
      return reuse;
    }
    const spr = this.scene.add.sprite(0, 0, tex).setDepth(7);
    spr.setBlendMode(Phaser.BlendModes.ADD);
    return spr;
  }

  private release(spr: Phaser.GameObjects.Sprite) {
    spr.setActive(false).setVisible(false);
    if (this.pool.length < 64) this.pool.push(spr);
    else spr.destroy();
  }

  destroy() {
    for (const spr of this.sprites.values()) spr.destroy();
    for (const spr of this.pool) spr.destroy();
    this.sprites.clear();
    this.pool = [];
  }
}
