import Phaser from "phaser";
import { soloEngine, type SoloSnapshot } from "../solo/SoloEngine";
import { loadSettings } from "../settings";
import { ArenaBackground } from "../visual/ArenaBackground";
import { VfxManager } from "../visual/VfxManager";
import { ProjectileRenderer } from "../visual/ProjectileRenderer";
// Sprite scaling is now applied once in spriteEntity factories; no per-frame
// scale work needed here.
import { pickupDisplayScale } from "../spriteScale";
import { registerSpriteAnims, playEnemyAnim, playPickupAnim, playPlayerAnim } from "../spriteAnims";
import { cleanAllSpriteTextures } from "../spriteCleanup";
import { createEnemySprite, createPickupSprite, createPlayerSprite } from "../spriteEntity";
import { SpritePool } from "../spritePool";
import { audioManager } from "../../audio/AudioManager";
import { eventBus } from "../eventBus";
import { BOSS_TINTS } from "../spriteAssets";
import { getStage } from "@jjk/game-core";

const OFFSCREEN_MARGIN = 220;
const DAMAGE_TEXT_MIN_INTERVAL_MS = 220;

export class SoloRunScene extends Phaser.Scene {
  private playerSprite?: Phaser.GameObjects.Sprite;
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private pickupSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyPrev = new Map<string, { x: number; y: number }>();
  private domainActive = false;
  private unsub?: () => void;
  private busUnsub?: () => void;
  private particleScale = 1;
  private arena?: ArenaBackground;
  private vfx?: VfxManager;
  private lastAim = 0;
  private lastFaceLeft = false;
  private enemyHp = new Map<string, number>();
  private reduceMotion = false;
  private colorBlind = false;
  private damageTextLast = new Map<string, { ts: number; pending: number }>();
  private fpsSamples: number[] = [];
  private autoQualityDownshifted = false;
  private enemyPool?: SpritePool;
  private pickupPool?: SpritePool;
  private enemyKey = new Map<string, string>();
  private lastStageId: string | null = null;
  private pickupKey = new Map<string, string>();
  private projectiles?: ProjectileRenderer;
  private followInitialized = false;
  private bossIntroPlayed = false;

  constructor() {
    super("SoloRun");
  }

  setReduceMotion(on: boolean) {
    this.reduceMotion = on;
  }

  setColorBlind(on: boolean) {
    this.colorBlind = on;
    this.vfx?.setColorBlind(on);
  }

  create() {
    const settings = loadSettings();
    this.particleScale =
      settings.particles === "low" ? 0.35 : settings.particles === "high" ? 1.2 : 1;
    this.colorBlind = settings.colorBlind;
    this.reduceMotion = settings.reduceMotion;

    this.arena = new ArenaBackground(this);
    this.vfx = new VfxManager(this, this.particleScale);
    this.vfx.setColorBlind(this.colorBlind);
    cleanAllSpriteTextures(this);
    if (!this.anims.exists("yuji_idle")) registerSpriteAnims(this);

    this.enemyPool = new SpritePool(this, (s, x, y, key) => createEnemySprite(s, x, y, key));
    this.pickupPool = new SpritePool(this, (s, x, y, key) => createPickupSprite(s, x, y, key));
    this.projectiles = new ProjectileRenderer(this);

    this.unsub = soloEngine.subscribe((snap) => this.sync(snap));
    this.busUnsub = eventBus.on((e) => {
      if (e.kind === "boss_telegraph") {
        this.vfx?.spawnTelegraph(e.x, e.y, this.reduceMotion ? 160 : 180, e.durationMs, e.label);
        if (!this.reduceMotion) this.cameras.main.shake(120, 0.005);
      }
      if (e.kind === "boss_spawn" && !this.bossIntroPlayed) {
        this.bossIntroPlayed = true;
        this.vfx?.spawnBossIntro(this.cameras.main, this.reduceMotion);
        audioManager.playBossStinger?.();
      }
      if (e.kind === "boss_defeated" && !this.reduceMotion) {
        this.cameras.main.flash(400, 200, 100, 255);
      }
      if (e.kind === "dash") {
        this.vfx?.spawnDashTrail(e.x, e.y, e.angle);
        if (!this.reduceMotion) this.cameras.main.shake(60, 0.003);
        audioManager.playPing();
      }
      if (e.kind === "xp_gain") {
        this.vfx?.spawnDamageText(e.x, e.y - 24, `+${Math.round(e.amount)} XP`, 0xa3e635);
      }
      if (e.kind === "health_pickup") {
        this.vfx?.spawnDamageText(e.x, e.y - 24, `+${e.amount} HP`, 0x4ade80);
      }
    });
  }

  update(_time: number, deltaMs: number) {
    const cam = this.cameras.main;
    // Phaser passes ms; ambience math is in seconds so convert here. Cap
    // dt to avoid huge jumps when the tab regains focus.
    const dt = Math.min(1 / 30, (deltaMs ?? 16) / 1000);
    this.arena?.update(cam, dt);
    this.cullSprites(cam);
    this.autoQualityWatchdog();
  }

  private cullSprites(cam: Phaser.Cameras.Scene2D.Camera) {
    const left = cam.scrollX - OFFSCREEN_MARGIN;
    const right = cam.scrollX + cam.width + OFFSCREEN_MARGIN;
    const top = cam.scrollY - OFFSCREEN_MARGIN;
    const bottom = cam.scrollY + cam.height + OFFSCREEN_MARGIN;
    for (const spr of this.enemySprites.values()) {
      spr.setVisible(spr.x >= left && spr.x <= right && spr.y >= top && spr.y <= bottom);
    }
    for (const spr of this.pickupSprites.values()) {
      spr.setVisible(spr.x >= left && spr.x <= right && spr.y >= top && spr.y <= bottom);
    }
  }

  private autoQualityWatchdog() {
    const fps = this.game.loop.actualFps;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
    if (!this.autoQualityDownshifted && this.fpsSamples.length === 60) {
      const avg = this.fpsSamples.reduce((s, n) => s + n, 0) / 60;
      if (avg < 32 && this.particleScale > 0.5) {
        this.particleScale = 0.35;
        this.autoQualityDownshifted = true;
        eventBus.emit({ kind: "info", message: "Performance mode enabled" });
      }
    }
  }

  shutdown() {
    this.unsub?.();
    this.busUnsub?.();
    this.arena?.destroy();
    this.vfx?.destroy();
    this.projectiles?.destroy();
    this.enemyPool?.drain();
    this.pickupPool?.drain();
    this.followInitialized = false;
    this.bossIntroPlayed = false;
  }

  private sync(snap: SoloSnapshot) {
    const cam = this.cameras.main;
    const p = snap.player;
    if (!this.followInitialized) {
      cam.centerOn(p.x, p.y);
      this.followInitialized = true;
    } else {
      // Smooth lerp toward the player so screen-shake/dashes feel kinetic
      // rather than the camera teleporting to a new target each tick.
      const lerp = this.reduceMotion ? 1 : 0.18;
      const targetX = p.x;
      const targetY = p.y;
      const curX = cam.scrollX + cam.width / 2;
      const curY = cam.scrollY + cam.height / 2;
      const nx = curX + (targetX - curX) * lerp;
      const ny = curY + (targetY - curY) * lerp;
      cam.centerOn(nx, ny);
    }
    // Zoom out slightly while boss is alive so the fight has more room.
    const targetZoom = snap.bossSpawned ? 0.5 : 0.55;
    const zLerp = this.reduceMotion ? 1 : 0.12;
    cam.setZoom(cam.zoom + (targetZoom - cam.zoom) * zLerp);

    if (!this.playerSprite) {
      this.playerSprite = createPlayerSprite(this, p.x, p.y, p.characterId);
      this.vfx?.attachPlayerGlow(p.characterId, this.playerSprite);
    }
    this.playerSprite.setPosition(p.x, p.y);
    // Scale is set once at construction; recomputing every frame was wasted
    // work and could nudge `roundPixels` between equal-but-distinct rounding
    // cases, causing 1px shimmer.
    // Y-sorted depth so taller enemies behind the player draw underneath.
    this.playerSprite.setDepth(10 + p.y * 0.001);
    // Blink while invulnerable; 35% alpha while downed.
    if (p.downed) this.playerSprite.setAlpha(0.35);
    else if (p.invulnSec > 0)
      this.playerSprite.setAlpha(Math.floor(this.time.now / 80) % 2 ? 0.55 : 1);
    else this.playerSprite.setAlpha(1);

    const moving = Math.hypot(soloEngine.moveX, soloEngine.moveY) > 0.1;
    // Face direction should stick to the last movement input, not snap back
    // to "right" when the player stops.
    if (Math.abs(soloEngine.moveX) > 0.05) this.lastFaceLeft = soloEngine.moveX < 0;
    const faceLeft = this.lastFaceLeft;
    playPlayerAnim(this.playerSprite, p.characterId, { moving, downed: p.downed, faceLeft });
    this.vfx?.updatePlayer(p.x, p.y, moving, p.domainActive);
    if (moving) this.lastAim = soloEngine.aimAngle;
    // Faint aim indicator helps mobile players (no mouse) read where they're firing.
    this.vfx?.updateAimIndicator(p.x, p.y, this.lastAim, !p.downed && !p.choosingUpgrade);

    if (p.domainActive && !this.domainActive) {
      this.domainActive = true;
      this.vfx?.spawnDomain(p.x, p.y);
    }
    if (!p.domainActive) this.domainActive = false;
    this.arena?.setBossActive(snap.bossSpawned && snap.bossHp > 0);
    this.arena?.setDomainActive(p.domainActive);
    // Re-apply the picked stage tint + music + ambience if it has changed.
    if (snap.stage && this.lastStageId !== snap.stage) {
      this.lastStageId = snap.stage;
      const stageDef = getStage(snap.stage);
      this.arena?.setStage(stageDef);
      if (stageDef) audioManager.setMusicTheme(stageDef.music);
    }
    // Damage-driven shake (Tier 2 #6) — engine reports rolling DPS.
    if (!this.reduceMotion) this.vfx?.applyDamageShake(snap.telemetry.recentDps);
    // Revive ring (Tier 3 #11) — solo player only; engine doesn't track
    // revive progress directly so we just show "downed" indication here.
    if (p.downed) this.vfx?.updateReviveRing("self", p.x, p.y, 0.5);
    else this.vfx?.clearReviveRing("self");

    this.vfx?.checkLevelUp(p.level, p.x, p.y);
    this.vfx?.checkExorcism(snap.exorcismCount, p.x, p.y);

    if (soloEngine.effects.magnetMul > 1) {
      this.vfx?.updateMagnetRing(p.x, p.y, soloEngine.magnetRadius());
    } else {
      this.vfx?.updateMagnetRing(p.x, p.y, 0);
    }

    const cap = this.particleScale < 0.5 ? 50 : this.particleScale > 1 ? 120 : 90;
    const enemyList: { id: string; x: number; y: number; boss: boolean; elite: boolean }[] = [];

    const seen = new Set<string>();
    const now = this.time.now;
    let n = 0;
    for (const e of snap.enemies) {
      if (n++ >= cap) break;
      seen.add(e.id);
      enemyList.push({ id: e.id, x: e.x, y: e.y, boss: e.boss, elite: e.elite });

      let spr = this.enemySprites.get(e.id);
      const texE = `enemy_${e.typeId}`;
      if (!spr) {
        spr = this.enemyPool!.acquire(texE, e.x, e.y);
        this.enemySprites.set(e.id, spr);
        this.enemyKey.set(e.id, texE);
        this.enemyPrev.set(e.id, { x: e.x, y: e.y });
        // Re-apply the boss tint that the pool's `clearTint()` strips on reuse.
        if (e.boss) {
          const tint = BOSS_TINTS[e.typeId];
          if (tint !== undefined) spr.setTint(tint);
        }
      }
      const prev = this.enemyPrev.get(e.id);
      const enemyMoving = prev ? Math.hypot(e.x - prev.x, e.y - prev.y) > 1.5 : false;
      this.enemyPrev.set(e.id, { x: e.x, y: e.y });

      spr.setPosition(e.x, e.y);
      // Scale is now baked in at acquire/create time; reapplying per-frame
      // caused subtle rounding jitter when paired with `roundPixels`.
      // Y-sort: lower-on-screen draws later, so we get natural overlap.
      spr.setDepth(5 + e.y * 0.001);
      playEnemyAnim(spr, texE, enemyMoving);
      this.vfx?.tintEnemySprite(spr, e.typeId, e.hp / e.maxHp, e.boss, e.elite);

      const prevHp = this.enemyHp.get(e.id);
      if (prevHp !== undefined && e.hp < prevHp - 0.5) {
        const dmg = prevHp - e.hp;
        this.vfx?.spawnHitSpark(e.x, e.y);
        audioManager.playSpatialHit(e.x, e.y, p.x, p.y);
        this.queueDamageText(e.id, e.x, e.y, dmg, now);
      }
      this.enemyHp.set(e.id, e.hp);

      if (e.boss) {
        spr.setAngle(Math.sin(this.time.now * 0.004) * 5);
      } else {
        spr.setAngle(0);
      }
    }

    this.flushDamageTexts(now);
    this.vfx?.trackEnemies(enemyList);
    // Edge-of-screen markers for off-camera elites + bosses so threats are readable.
    const indicatorTargets = enemyList
      .filter((e) => e.boss || e.elite)
      .map((e) => ({ x: e.x, y: e.y, boss: e.boss }));
    this.vfx?.updateOffscreenIndicators(cam, indicatorTargets);

    for (const [id, spr] of this.enemySprites) {
      if (!seen.has(id)) {
        const key = this.enemyKey.get(id) ?? "enemy_grade4";
        this.enemyPool!.release(key, spr);
        this.enemySprites.delete(id);
        this.enemyKey.delete(id);
        this.enemyPrev.delete(id);
        this.enemyHp.delete(id);
        this.damageTextLast.delete(id);
      }
    }

    const seenP = new Set<string>();
    for (const gem of snap.pickups) {
      seenP.add(gem.id);
      let spr = this.pickupSprites.get(gem.id);
      const tex =
        gem.kind === "health" ? "pickup_health" : gem.kind === "bomb" ? "pickup_bomb" : "pickup_xp";
      const prevKey = this.pickupKey.get(gem.id);
      if (spr && prevKey && prevKey !== tex) {
        this.pickupPool!.release(prevKey, spr);
        this.pickupSprites.delete(gem.id);
        spr = undefined;
      }
      if (!spr) {
        spr = this.pickupPool!.acquire(tex, gem.x, gem.y);
        this.pickupSprites.set(gem.id, spr);
        this.pickupKey.set(gem.id, tex);
      }
      spr.setPosition(gem.x, gem.y);
      if (gem.kind === "xp") {
        playPickupAnim(spr);
      } else {
        spr.stop();
      }
      const baseScale =
        gem.kind === "health" ? 1.0 : gem.kind === "bomb" ? 1.05 : pickupDisplayScale();
      spr.setScale(baseScale * (1 + Math.sin(this.time.now * 0.012 + gem.x) * 0.12));
      spr.setDepth(gem.kind === "xp" ? 3 : 4);
    }
    for (const [id, spr] of this.pickupSprites) {
      if (!seenP.has(id)) {
        const key = this.pickupKey.get(id) ?? "pickup_xp";
        this.pickupPool!.release(key, spr);
        this.pickupSprites.delete(id);
        this.pickupKey.delete(id);
      }
    }

    this.projectiles?.sync(snap.projectiles);

    // Small camera kick on elite/boss projectile hits so heavy attacks feel weighty.
    // Per-enemy hit sparks are already emitted by the prevHp comparison above.
    if (snap.hits.length) {
      let elite = false;
      let crit = false;
      for (const h of snap.hits) {
        if (h.elite) elite = true;
        if (h.crit) {
          crit = true;
          this.vfx?.spawnCritBurst(h.x, h.y);
        }
        // Combo pitch ramp (Tier 2 #7) — each hit climbs the tone slightly.
        audioManager.playHitBeep();
      }
      if (!this.reduceMotion) {
        if (crit) this.cameras.main.shake(80, 0.0045);
        else if (elite) this.cameras.main.shake(60, 0.0028);
      }
    } else {
      // No new hits this tick — reset the combo so the next chain starts at base pitch.
      audioManager.setHitCombo(0);
    }

    if (snap.timeScale < 1 && !p.choosingUpgrade) {
      cam.setAlpha(0.85 + snap.timeScale * 0.15);
    } else {
      cam.setAlpha(1);
    }
  }

  /** Aggregate damage per enemy so high-DPS builds don't spam floating numbers */
  private queueDamageText(id: string, x: number, y: number, dmg: number, now: number) {
    const prev = this.damageTextLast.get(id);
    const pending = (prev?.pending ?? 0) + dmg;
    const last = prev?.ts ?? 0;
    if (now - last >= DAMAGE_TEXT_MIN_INTERVAL_MS) {
      const rounded = Math.round(pending);
      if (rounded > 0 && rounded < 4000) {
        this.vfx?.spawnDamageText(x, y - 16, String(rounded), 0xfbbf24);
      }
      this.damageTextLast.set(id, { ts: now, pending: 0 });
    } else {
      this.damageTextLast.set(id, { ts: last, pending });
    }
  }

  private flushDamageTexts(now: number) {
    for (const [id, info] of this.damageTextLast) {
      if (now - info.ts >= 600 && info.pending > 0) {
        const rounded = Math.round(info.pending);
        const spr = this.enemySprites.get(id);
        if (spr && rounded > 0 && rounded < 4000) {
          this.vfx?.spawnDamageText(spr.x, spr.y - 16, String(rounded), 0xfbbf24);
        }
        this.damageTextLast.set(id, { ts: now, pending: 0 });
      }
    }
  }
}
