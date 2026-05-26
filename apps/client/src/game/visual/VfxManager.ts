import Phaser from "phaser";
const CHAR_COLORS: Record<string, number> = {
  yuji: 0xff6b4a,
  megumi: 0x4a7cff,
  nobara: 0xff4a8c,
  gojo: 0x9b7bff,
};

export class VfxManager {
  private enemyLastPos = new Map<string, { x: number; y: number; boss: boolean; elite: boolean }>();
  private lastLevel = 1;
  private lastExorcism = 0;
  private attackPulse = 0;
  private playerGlow?: Phaser.GameObjects.Image;
  private playerTrail?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private scene: Phaser.Scene,
    private particleScale: number
  ) {}

  /**
   * Damage-driven screen shake (Tier 2 #6). Engine reports a smoothed
   * "recentDps" each frame; we map that to a duration + intensity envelope
   * so big bursts feel meaty without a constant low-grade tremor.
   */
  private shakeAccumulator = 0;
  applyDamageShake(recentDps: number) {
    if (recentDps < 80) return;
    const t = Math.min(1, (recentDps - 80) / 600);
    // Limit how often we trigger so this doesn't stack frame-to-frame.
    this.shakeAccumulator -= this.scene.game.loop.delta;
    if (this.shakeAccumulator > 0) return;
    this.shakeAccumulator = 220;
    const intensity = 0.0015 + t * 0.006;
    const duration = 80 + t * 220;
    this.scene.cameras.main.shake(duration, intensity);
  }

  /**
   * Soft glowing ring drawn around downed players so allies (or the player
   * themselves in solo) can see exactly where the revive zone is. Tier 3 #11.
   * Caller passes the world coords + a 0..1 progress.
   */
  private reviveRings = new Map<string, Phaser.GameObjects.Graphics>();
  updateReviveRing(id: string, x: number, y: number, progress: number) {
    let g = this.reviveRings.get(id);
    if (!g) {
      g = this.scene.add.graphics().setDepth(11);
      this.reviveRings.set(id, g);
    }
    g.clear();
    const r = 70;
    g.lineStyle(3, 0x4ade80, 0.8);
    g.strokeCircle(x, y, r);
    // Arc indicates revive progress (0..1).
    if (progress > 0) {
      g.lineStyle(6, 0xa3e635, 0.9);
      g.beginPath();
      g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
      g.strokePath();
    }
    // Subtle pulse outside the main ring.
    const pulseR = r + 8 + Math.sin(this.scene.time.now * 0.006) * 4;
    g.lineStyle(1, 0x86efac, 0.35);
    g.strokeCircle(x, y, pulseR);
  }
  clearReviveRing(id: string) {
    const g = this.reviveRings.get(id);
    if (g) {
      g.destroy();
      this.reviveRings.delete(id);
    }
  }

  attachPlayerGlow(
    characterId: string,
    followTarget?: Phaser.GameObjects.Sprite
  ) {
    if (this.playerGlow) this.playerGlow.destroy();
    this.playerGlow = this.scene.add
      .image(0, 0, "player_glow")
      .setDepth(9)
      .setTint(CHAR_COLORS[characterId] ?? 0x9b7bff)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);

    const follow = followTarget ?? this.playerGlow;
    if (this.particleScale > 0.4 && this.scene.textures.exists("particle_spark")) {
      this.playerTrail = this.scene.add.particles(0, 0, "particle_spark", {
        speed: { min: 8, max: 24 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 400,
        frequency: 80,
        quantity: 1,
        tint: CHAR_COLORS[characterId] ?? 0xffffff,
        blendMode: Phaser.BlendModes.ADD,
        follow,
      });
      this.playerTrail.setDepth(8);
    }
  }

  updatePlayer(x: number, y: number, moving: boolean, domainActive: boolean) {
    if (!this.playerGlow) return;
    this.playerGlow.setPosition(x, y);
    // Texture is 56px; a 1.0 scale already feels right under the character.
    const pulse = 1.0 + Math.sin(this.scene.time.now * 0.008) * 0.08;
    this.playerGlow.setScale(domainActive ? pulse * 1.8 : pulse);
    this.playerGlow.setAlpha(domainActive ? 0.85 : moving ? 0.45 : 0.3);
    if (this.playerTrail) {
      this.playerTrail.setFrequency(moving ? 60 : 240);
    }
  }

  /**
   * Edge-of-screen arrows pointing toward off-camera elites & bosses so the
   * player knows where threats are when they wander off the visible area.
   */
  private offscreenGfx?: Phaser.GameObjects.Graphics;
  updateOffscreenIndicators(
    camera: Phaser.Cameras.Scene2D.Camera,
    targets: Array<{ x: number; y: number; boss: boolean }>
  ) {
    if (!this.offscreenGfx) {
      this.offscreenGfx = this.scene.add.graphics().setDepth(19).setScrollFactor(0);
    }
    const g = this.offscreenGfx;
    g.clear();
    if (!targets.length) return;
    const w = camera.width / camera.zoom;
    const h = camera.height / camera.zoom;
    const margin = 30;
    const left = camera.scrollX + margin;
    const right = camera.scrollX + w - margin;
    const top = camera.scrollY + margin;
    const bottom = camera.scrollY + h - margin;
    for (const t of targets) {
      if (t.x >= left && t.x <= right && t.y >= top && t.y <= bottom) continue;
      // Vector from camera centre to target, clamped to viewport edge.
      const cx = camera.scrollX + w / 2;
      const cy = camera.scrollY + h / 2;
      const dx = t.x - cx;
      const dy = t.y - cy;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const nx = dx / len;
      const ny = dy / len;
      // Clamp to a soft inset rectangle.
      const halfW = w / 2 - margin;
      const halfH = h / 2 - margin;
      const scale = Math.min(halfW / Math.abs(nx || 1e-3), halfH / Math.abs(ny || 1e-3));
      const sx = cx + nx * scale;
      const sy = cy + ny * scale;
      const ang = Math.atan2(dy, dx);
      // Screen-space coords for the graphics object (it has scrollFactor 0).
      const scx = (sx - camera.scrollX) * camera.zoom;
      const scy = (sy - camera.scrollY) * camera.zoom;
      const color = t.boss ? 0xef4444 : 0xc4b5fd;
      const size = t.boss ? 16 : 11;
      const baseAng = ang + Math.PI / 2;
      const tx = scx + Math.cos(ang) * size;
      const ty = scy + Math.sin(ang) * size;
      const blx = scx - Math.cos(ang) * size + Math.cos(baseAng) * size * 0.7;
      const bly = scy - Math.sin(ang) * size + Math.sin(baseAng) * size * 0.7;
      const brx = scx - Math.cos(ang) * size - Math.cos(baseAng) * size * 0.7;
      const bry = scy - Math.sin(ang) * size - Math.sin(baseAng) * size * 0.7;
      const pulse = 0.7 + Math.sin(this.scene.time.now * 0.006) * 0.25;
      g.fillStyle(color, pulse);
      g.fillTriangle(tx, ty, blx, bly, brx, bry);
      g.lineStyle(2, 0x000000, 0.6);
      g.strokeTriangle(tx, ty, blx, bly, brx, bry);
    }
  }

  /** Soft aim-direction triangle just in front of the player. */
  private aimArrow?: Phaser.GameObjects.Graphics;
  updateAimIndicator(x: number, y: number, aimAngle: number, visible: boolean) {
    if (!visible) {
      this.aimArrow?.setVisible(false);
      return;
    }
    if (!this.aimArrow) {
      this.aimArrow = this.scene.add.graphics().setDepth(9);
      this.aimArrow.setBlendMode(Phaser.BlendModes.ADD);
    }
    this.aimArrow.setVisible(true);
    this.aimArrow.clear();
    const dist = 42;
    const tipX = x + Math.cos(aimAngle) * dist;
    const tipY = y + Math.sin(aimAngle) * dist;
    const baseAng = aimAngle + Math.PI / 2;
    const bw = 7;
    const bxL = x + Math.cos(aimAngle) * (dist - 14) + Math.cos(baseAng) * bw;
    const byL = y + Math.sin(aimAngle) * (dist - 14) + Math.sin(baseAng) * bw;
    const bxR = x + Math.cos(aimAngle) * (dist - 14) - Math.cos(baseAng) * bw;
    const byR = y + Math.sin(aimAngle) * (dist - 14) - Math.sin(baseAng) * bw;
    this.aimArrow.fillStyle(0xc4b5fd, 0.55);
    this.aimArrow.fillTriangle(tipX, tipY, bxL, byL, bxR, byR);
  }

  tickAttackVisual(x: number, y: number, aimAngle: number, characterId: string) {
    this.attackPulse += 0.05;
    if (this.attackPulse < 0.35) return;
    this.attackPulse = 0;

    const color = CHAR_COLORS[characterId] ?? 0xc084fc;
    const arc = this.scene.add.graphics().setDepth(7);
    arc.setPosition(x, y);
    arc.lineStyle(3, color, 0.45);
    arc.beginPath();
    arc.arc(0, 0, 72, aimAngle - 0.5, aimAngle + 0.5, false);
    arc.strokePath();
    arc.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: arc,
      alpha: 0,
      duration: 180,
      onComplete: () => arc.destroy(),
    });
  }

  trackEnemies(
    enemies: { id: string; x: number; y: number; boss: boolean; elite: boolean }[]
  ) {
    const seen = new Set<string>();
    for (const e of enemies) {
      seen.add(e.id);
      this.enemyLastPos.set(e.id, { x: e.x, y: e.y, boss: e.boss, elite: e.elite });
    }
    for (const [id, pos] of this.enemyLastPos) {
      if (!seen.has(id)) {
        this.spawnDeath(pos.x, pos.y, pos.boss, pos.elite);
        this.enemyLastPos.delete(id);
      }
    }
  }

  spawnDeath(x: number, y: number, boss: boolean, elite: boolean) {
    if (this.particleScale <= 0) return;

    const key = boss ? "particle_boss" : elite ? "particle_elite" : "particle_hit";
    if (!this.scene.textures.exists(key)) return;

    const count = boss ? 24 : elite ? 14 : 8;
    const emitter = this.scene.add.particles(x, y, key, {
      speed: { min: 40, max: boss ? 220 : 120 },
      angle: { min: 0, max: 360 },
      scale: { start: boss ? 1.2 : 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: boss ? 600 : 350,
      quantity: count,
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(12);
    this.scene.time.delayedCall(500, () => emitter.destroy());

    if (boss) {
      this.scene.cameras.main.shake(280, 0.025);
      this.scene.cameras.main.flash(200, 239, 68, 68, false);
    } else if (elite) {
      this.scene.cameras.main.shake(80, 0.008);
    }

    this.spawnDamageText(x, y - 20, boss ? "EXORCISED!" : elite ? "Grade+" : "+", 0xfbbf24);
  }

  /** Punchy yellow ring + text used when a Black Flash crit lands. */
  spawnCritBurst(x: number, y: number) {
    if (this.particleScale <= 0 || !this.scene.textures.exists("particle_hit")) return;
    const e = this.scene.add.particles(x, y, "particle_hit", {
      speed: { min: 90, max: 240 },
      scale: { start: 1.1, end: 0 },
      lifespan: 340,
      quantity: 16,
      tint: 0xfde047,
      blendMode: Phaser.BlendModes.ADD,
    });
    e.setDepth(13);
    this.scene.time.delayedCall(380, () => e.destroy());

    // Brief amber ring shockwave.
    const ring = this.scene.add.graphics().setDepth(13);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(3, 0xfde047, 0.9);
    ring.strokeCircle(x, y, 10);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 1, to: 3.4 },
      alpha: 0,
      duration: 340,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    this.spawnDamageText(x, y - 28, "CRIT!", 0xfde047);
  }

  spawnHitSpark(x: number, y: number, color = 0xc084fc) {
    if (this.particleScale <= 0 || !this.scene.textures.exists("particle_hit")) return;
    const e = this.scene.add.particles(x, y, "particle_hit", {
      speed: { min: 30, max: 90 },
      scale: { start: 0.5, end: 0 },
      lifespan: 200,
      quantity: 5,
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
    });
    e.setDepth(11);
    this.scene.time.delayedCall(250, () => e.destroy());
  }

  spawnDamageText(x: number, y: number, text: string, color = 0xfbbf24) {
    const t = this.scene.add
      .text(x, y, text, {
        fontSize: bossTextSize(text),
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scale: 1.2,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  checkLevelUp(level: number, x: number, y: number) {
    if (level > this.lastLevel) {
      this.lastLevel = level;
      this.scene.cameras.main.flash(120, 155, 123, 255, false);
      if (this.particleScale > 0 && this.scene.textures.exists("particle_spark")) {
        const ring = this.scene.add.particles(x, y, "particle_spark", {
          speed: { min: 60, max: 140 },
          scale: { start: 0.8, end: 0 },
          lifespan: 500,
          quantity: 20,
          tint: 0xc084fc,
          blendMode: Phaser.BlendModes.ADD,
        });
        ring.setDepth(15);
        this.scene.time.delayedCall(600, () => ring.destroy());
      }
      this.spawnDamageText(x, y - 40, "LEVEL UP!", 0xc084fc);
    }
  }

  checkExorcism(count: number, x: number, y: number) {
    if (count > this.lastExorcism && count % 25 === 0) {
      this.spawnDamageText(x, y - 60, `${count} exorcised`, 0x94a3b8);
    }
    this.lastExorcism = count;
  }

  spawnDomain(x: number, y: number) {
    const ring = this.scene.add.image(x, y, "domain_ring").setDepth(6).setAlpha(0.95);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scale: { from: 2, to: 8 },
      alpha: { from: 0.95, to: 0 },
      duration: 8000,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy(),
    });

    const border = this.scene.add.graphics().setDepth(5);
    border.lineStyle(6, 0x9b7bff, 0.8);
    border.strokeCircle(x, y, 40);
    border.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: border,
      alpha: 0,
      duration: 8000,
      onComplete: () => border.destroy(),
    });

    if (this.particleScale > 0 && this.scene.textures.exists("particle_curse")) {
      const flood = this.scene.add.particles(x, y, "particle_curse", {
        speed: { min: 80, max: 200 },
        scale: { start: 1, end: 0 },
        lifespan: 900,
        quantity: 40,
        blendMode: Phaser.BlendModes.ADD,
      });
      flood.setDepth(14);
      this.scene.time.delayedCall(1000, () => flood.destroy());
    }

    this.scene.cameras.main.shake(400, 0.02);
    this.scene.cameras.main.flash(300, 147, 51, 234, false);
  }

  pulsePickup(sprite: Phaser.GameObjects.Image, time: number) {
    const s = 0.85 + Math.sin(time * 0.01 + sprite.x) * 0.15;
    sprite.setScale(s);
    sprite.setAlpha(0.7 + Math.sin(time * 0.012) * 0.3);
  }

  /** Set color-blind-friendly tint palette (high-saturation shapes by tier) */
  private colorBlind = false;
  setColorBlind(on: boolean) {
    this.colorBlind = on;
  }

  tintEnemySprite(
    sprite: Phaser.GameObjects.Sprite,
    _typeId: string,
    hpRatio: number,
    boss: boolean,
    elite: boolean
  ) {
    if (boss) {
      sprite.setTint(this.colorBlind ? 0xff7700 : 0xffaaaa);
      sprite.setAlpha(0.95 + Math.sin(this.scene.time.now * 0.01) * 0.05);
    } else if (elite) {
      sprite.setTint(this.colorBlind ? 0x00ddff : 0xddd6fe);
    } else if (hpRatio < 0.35) {
      sprite.setTint(this.colorBlind ? 0xffee44 : 0xffcccc);
    } else {
      sprite.clearTint();
    }
  }

  /** Render a magnet pickup-radius ring that follows the player */
  private magnetRing?: Phaser.GameObjects.Graphics;
  updateMagnetRing(x: number, y: number, radius: number) {
    if (radius <= 0) {
      this.magnetRing?.destroy();
      this.magnetRing = undefined;
      return;
    }
    if (!this.magnetRing) {
      this.magnetRing = this.scene.add.graphics().setDepth(2);
      this.magnetRing.setBlendMode(Phaser.BlendModes.ADD);
    }
    this.magnetRing.clear();
    const pulse = 0.6 + Math.sin(this.scene.time.now * 0.004) * 0.15;
    this.magnetRing.lineStyle(2, 0x60a5fa, 0.18 * pulse);
    this.magnetRing.strokeCircle(x, y, radius);
    this.magnetRing.lineStyle(1, 0x60a5fa, 0.4 * pulse);
    this.magnetRing.strokeCircle(x, y, radius * 0.97);
  }

  /** Boss telegraph circle that fades in/out over duration */
  spawnTelegraph(x: number, y: number, radius: number, durationMs: number, label?: string) {
    const g = this.scene.add.graphics().setDepth(8);
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xef4444, 0.18);
    g.fillCircle(x, y, radius);
    g.lineStyle(3, 0xef4444, 0.9);
    g.strokeCircle(x, y, radius);

    this.scene.tweens.add({
      targets: g,
      alpha: { from: 0.2, to: 1 },
      duration: durationMs * 0.7,
      ease: "Cubic.easeIn",
      yoyo: false,
    });
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 250,
      delay: durationMs,
      onComplete: () => g.destroy(),
    });
    if (label) {
      const t = this.scene.add
        .text(x, y - radius - 14, label, {
          fontSize: "14px",
          color: "#fecaca",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(9);
      this.scene.tweens.add({
        targets: t,
        alpha: 0,
        duration: 350,
        delay: durationMs,
        onComplete: () => t.destroy(),
      });
    }
  }

  /** Boss intro cinematic — name banner, flash, and a brief camera zoom punch. */
  spawnBossIntro(cam: Phaser.Cameras.Scene2D.Camera, reduceMotion: boolean) {
    const cx = cam.scrollX + cam.width / 2;
    const cy = cam.scrollY + cam.height / 2;

    const dim = this.scene.add
      .rectangle(cx, cy, cam.width / cam.zoom, cam.height / cam.zoom, 0x000000, 0)
      .setDepth(28)
      .setScrollFactor(0);
    const banner = this.scene.add
      .text(cam.width / 2, cam.height / 2 - 6, "SPECIAL GRADE", {
        fontSize: "48px",
        color: "#fecaca",
        fontStyle: "900",
        stroke: "#7f1d1d",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0)
      .setAlpha(0);
    const sub = this.scene.add
      .text(cam.width / 2, cam.height / 2 + 36, "Sukuna's Finger Bearer", {
        fontSize: "18px",
        color: "#fde68a",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0)
      .setAlpha(0);

    const dur = reduceMotion ? 900 : 1600;
    this.scene.tweens.add({
      targets: dim,
      fillAlpha: { from: 0, to: 0.55 },
      duration: dur * 0.25,
      yoyo: true,
      hold: dur * 0.5,
      onComplete: () => dim.destroy(),
    });
    this.scene.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scale: { from: 1.4, to: 1 },
      duration: dur * 0.3,
      ease: "Cubic.easeOut",
    });
    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 300,
      delay: dur * 0.65,
      onComplete: () => banner.destroy(),
    });
    this.scene.tweens.add({
      targets: sub,
      alpha: { from: 0, to: 1 },
      duration: dur * 0.3,
      delay: 150,
    });
    this.scene.tweens.add({
      targets: sub,
      alpha: 0,
      duration: 300,
      delay: dur * 0.65,
      onComplete: () => sub.destroy(),
    });

    if (!reduceMotion) {
      cam.flash(180, 220, 50, 60, false);
      cam.shake(450, 0.012);
    }
  }

  /** Dash trail — short streak of sparks in the dash direction. */
  spawnDashTrail(x: number, y: number, angle: number) {
    if (this.particleScale <= 0 || !this.scene.textures.exists("particle_spark")) return;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const e = this.scene.add.particles(x, y, "particle_spark", {
      speed: { min: 60, max: 220 },
      lifespan: 320,
      quantity: 18,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: 0xc7d2fe,
      angle: { min: (angle - Math.PI) * (180 / Math.PI) - 18, max: (angle - Math.PI) * (180 / Math.PI) + 18 },
      blendMode: Phaser.BlendModes.ADD,
    });
    e.setDepth(11);
    this.scene.time.delayedCall(380, () => e.destroy());
    // Small forward streak (line afterimage) for kinetic feel.
    const g = this.scene.add.graphics().setDepth(11);
    g.setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(6, 0xc7d2fe, 0.65);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - ux * 80, y - uy * 80);
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }

  /** Co-op ping marker (drops on world position, fades, with label) */
  spawnPing(x: number, y: number, label: string) {
    const ring = this.scene.add.graphics().setDepth(18);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(3, 0xfbbf24, 0.9);
    ring.strokeCircle(0, 0, 24);
    ring.setPosition(x, y);
    const text = this.scene.add
      .text(x, y - 36, label, {
        fontSize: "13px",
        color: "#fde68a",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(19);

    this.scene.tweens.add({
      targets: [ring],
      scale: { from: 1, to: 2.2 },
      alpha: 0,
      duration: 1800,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.scene.tweens.add({
      targets: [text],
      y: y - 56,
      alpha: 0,
      duration: 1800,
      onComplete: () => text.destroy(),
    });
  }

  destroy() {
    this.playerGlow?.destroy();
    this.playerTrail?.destroy();
    this.magnetRing?.destroy();
    this.aimArrow?.destroy();
    this.aimArrow = undefined;
    this.offscreenGfx?.destroy();
    this.offscreenGfx = undefined;
    for (const g of this.reviveRings.values()) g.destroy();
    this.reviveRings.clear();
    this.enemyLastPos.clear();
  }
}

function bossTextSize(text: string) {
  if (text.length > 6) return "18px";
  return "14px";
}
