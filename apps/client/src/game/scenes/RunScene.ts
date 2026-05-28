import Phaser from "phaser";
import { gameClient } from "../GameClient";
import { thermalEnemyCap, thermalParticleScale } from "../thermal";
import { enemyDisplayScale, pickupDisplayScale, playerDisplayScale } from "../spriteScale";
import { registerSpriteAnims, playEnemyAnim, playPickupAnim, playPlayerAnim } from "../spriteAnims";
import { cleanAllSpriteTextures } from "../spriteCleanup";
import { createEnemySprite, createPickupSprite, createPlayerSprite } from "../spriteEntity";
import { SpritePool } from "../spritePool";
import { InputActions } from "@jjk/shared-protocol";
import { loadSettings } from "../settings";
import { audioManager } from "../../audio/AudioManager";
import { ArenaBackground } from "../visual/ArenaBackground";
import { VfxManager } from "../visual/VfxManager";
import { eventBus } from "../eventBus";

const OFFSCREEN_MARGIN = 220;
const DAMAGE_TEXT_MIN_INTERVAL_MS = 220;

export interface RunSceneConfig {
  thermalLevel: string;
  onDomain?: () => void;
}

export class RunScene extends Phaser.Scene {
  private playerSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemySprites = new Map<string, Phaser.GameObjects.Sprite>();
  private pickupSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private enemyPrev = new Map<string, { x: number; y: number }>();
  private playerPrev = new Map<string, { x: number; y: number }>();
  private playerFace = new Map<string, boolean>();
  private thermalLevel = "nominal";
  private lastInputSend = 0;
  private joystick = { moveX: 0, moveY: 0 };
  private arena?: ArenaBackground;
  private vfx?: VfxManager;
  private particleScale = 1;
  private domainActive = false;
  private lastLevel = 1;
  private enemyHp = new Map<string, number>();
  private reduceMotion = false;
  private colorBlind = false;
  private damageTextLast = new Map<string, { ts: number; pending: number }>();
  private fpsSamples: number[] = [];
  private autoQualityDownshifted = false;
  private bossSpawnedFlag = false;
  private enemyPool?: SpritePool;
  private pickupPool?: SpritePool;
  private enemyKey = new Map<string, string>();
  /** Spectator camera anchor (Tier 3 #14). OnlineApp drives this via tap/key. */
  public spectatorIdx = 0;
  cycleSpectator() {
    this.spectatorIdx = (this.spectatorIdx + 1) | 0;
  }

  constructor() {
    super("Run");
  }

  init(data: RunSceneConfig) {
    this.thermalLevel = data?.thermalLevel ?? "nominal";
  }

  create() {
    const settings = loadSettings();
    this.particleScale =
      settings.particles === "low" ? 0.35 : settings.particles === "high" ? 1.2 : 1;
    this.arena = new ArenaBackground(this);
    this.vfx = new VfxManager(this, this.particleScale);
    cleanAllSpriteTextures(this);
    if (!this.anims.exists("yuji_idle")) {
      registerSpriteAnims(this);
    }

    this.colorBlind = settings.colorBlind;
    this.vfx.setColorBlind(this.colorBlind);

    this.enemyPool = new SpritePool(this, (s, x, y, key) => createEnemySprite(s, x, y, key));
    this.pickupPool = new SpritePool(this, (s, x, y, key) => createPickupSprite(s, x, y, key));

    const room = gameClient.room;
    if (!room) return;

    room.onMessage("boss_spawn", () => {
      if (!this.reduceMotion) this.cameras.main.flash(400, 239, 68, 68);
      this.vfx?.spawnDamageText(0, 0, "BOSS!", 0xef4444);
      eventBus.emit({ kind: "boss_spawn" });
      audioManager.playBossStinger();
    });
    room.onMessage("boss_phase2", () => {
      if (!this.reduceMotion) this.cameras.main.shake(300, 0.02);
      eventBus.emit({ kind: "boss_phase2" });
    });
    room.onMessage(
      "boss_telegraph",
      (data: { x: number; y: number; durationMs: number; label?: string }) => {
        this.vfx?.spawnTelegraph(data.x, data.y, 180, data.durationMs, data.label);
        if (!this.reduceMotion) this.cameras.main.shake(120, 0.005);
      }
    );
    room.onMessage(
      "player_downed",
      (data: { username: string }) => {
        eventBus.emit({ kind: "downed", username: data.username });
      }
    );
    room.onMessage(
      "player_revived",
      (data: { username: string }) => {
        eventBus.emit({ kind: "revived", username: data.username });
      }
    );
    room.onMessage(
      "co_ping",
      (data: { username: string; x: number; y: number; tag: string }) => {
        const label =
          data.tag === "boss"
            ? `${data.username}: Boss`
            : data.tag === "help"
            ? `${data.username}: Help!`
            : data.tag === "regroup"
            ? `${data.username}: Regroup`
            : `${data.username}: Here`;
        this.vfx?.spawnPing(data.x, data.y, label);
        audioManager.playPing();
      }
    );
    room.onMessage("run_end", () => this.cameras.main.fade(800, 0, 0, 0));
  }

  setColorBlind(on: boolean) {
    this.colorBlind = on;
    this.vfx?.setColorBlind(on);
  }

  setJoystick(moveX: number, moveY: number) {
    this.joystick.moveX = moveX;
    this.joystick.moveY = moveY;
  }

  setThermalLevel(level: string) {
    this.thermalLevel = level;
  }

  setReduceMotion(on: boolean) {
    this.reduceMotion = on;
  }

  triggerDomain() {
    const room = gameClient.room;
    const sid = gameClient.sessionId;
    if (!room || !sid) return;
    room.send("input", {
      seq: 0,
      moveX: 0,
      moveY: 0,
      aimAngle: 0,
      actions: InputActions.DOMAIN,
    });

    const me = gameClient.sessionId
      ? gameClient.state?.players.get(gameClient.sessionId)
      : null;
    if (me) this.vfx?.spawnDomain(me.x, me.y);
  }

  update(_time: number, _delta: number) {
    const state = gameClient.state;
    if (!state || state.phase !== "run") return;

    const cam = this.cameras.main;
    const myId = gameClient.sessionId;
    const me = myId ? state.players.get(myId) : null;
    if (me?.spectating) {
      // Spectator cycle (Tier 3 #14) — render the player at index
      // `spectatorIdx` (mod live count) so tapping cycles through allies.
      const alive = [...state.players.values()].filter(
        (p) => !p.downed && !p.spectating && p.sessionId !== myId
      );
      const target = alive[this.spectatorIdx % Math.max(1, alive.length)];
      if (target) cam.centerOn(target.x, target.y);
      else cam.centerOn(state.cameraX, state.cameraY);
    } else {
      cam.centerOn(state.cameraX, state.cameraY);
    }
    cam.setZoom(state.cameraZoom * 0.55);
    this.arena?.update(cam);

    this.sendInput();
    this.syncPlayers(state);
    this.syncEnemies(state);
    this.syncPickups(state);
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
        if (this.thermalLevel === "nominal") this.thermalLevel = "light";
        eventBus.emit({ kind: "info", message: "Performance mode enabled" });
      }
    }
  }

  private sendInput() {
    const now = performance.now();
    if (now - this.lastInputSend < 50) return;
    this.lastInputSend = now;

    const { moveX, moveY } = this.joystick;
    const aimAngle =
      Math.hypot(moveX, moveY) > 0.1
        ? Math.atan2(moveY, moveX)
        : 0;

    gameClient.sendInput({
      moveX,
      moveY,
      aimAngle,
      actions: InputActions.NONE,
    });
  }

  private syncPlayers(state: NonNullable<typeof gameClient.state>) {
    const scale = thermalParticleScale(this.thermalLevel);
    const seen = new Set<string>();
    const myId = gameClient.sessionId;

    state.players.forEach((p, sid) => {
      seen.add(sid);
      let spr = this.playerSprites.get(sid);
      if (!spr) {
        spr = createPlayerSprite(this, p.x, p.y, p.characterId);
        this.playerSprites.set(sid, spr);
        if (sid === myId) {
          this.vfx?.attachPlayerGlow(p.characterId, spr);
        }
      }
      spr.setPosition(p.x, p.y);
      spr.setAlpha(p.downed ? 0.4 : p.spectating ? 0.2 : 1);
      spr.setScale(playerDisplayScale(p.characterId) * scale);
      spr.setDepth(10 + p.y * 0.001);

      const isMe = sid === myId;
      const prevP = this.playerPrev.get(sid);
      const dx = prevP ? p.x - prevP.x : 0;
      this.playerPrev.set(sid, { x: p.x, y: p.y });

      const moveX = isMe ? this.joystick.moveX : dx;
      const moveY = isMe ? this.joystick.moveY : 0;
      const moving = isMe ? Math.hypot(moveX, moveY) > 0.1 : Math.abs(dx) > 2;
      // Persist facing from last meaningful movement, otherwise players snap
      // back to facing-right whenever they stop.
      const prevFaceLeft = this.playerFace.get(sid) ?? false;
      const nextFaceLeft = isMe
        ? Math.abs(moveX) > 0.05
          ? moveX < 0
          : prevFaceLeft
        : moving
          ? dx < 0
          : prevFaceLeft;
      this.playerFace.set(sid, nextFaceLeft);
      const faceLeft = nextFaceLeft;
      playPlayerAnim(spr, p.characterId, {
        moving,
        downed: p.downed,
        faceLeft,
      });

      if (isMe) {
        this.vfx?.updatePlayer(p.x, p.y, moving, p.domainActive);
        if (p.domainActive && !this.domainActive) {
          this.domainActive = true;
          this.vfx?.spawnDomain(p.x, p.y);
        }
        if (!p.domainActive) this.domainActive = false;
        this.arena?.setBossActive(this.bossSpawnedFlag);
        this.arena?.setDomainActive(p.domainActive);
        if (p.level > this.lastLevel) {
          this.lastLevel = p.level;
          this.vfx?.checkLevelUp(p.level, p.x, p.y);
        }
        if (moving) {
          // Aim direction tracked for future use; visible attacks are spawned
          // via the projectile system now.
          void Math.atan2(moveY, moveX);
        }
      }
    });

    for (const [sid, spr] of this.playerSprites) {
      if (!seen.has(sid)) {
        spr.destroy();
        this.playerSprites.delete(sid);
        this.playerPrev.delete(sid);
        this.playerFace.delete(sid);
      }
    }
  }

  private syncEnemies(state: NonNullable<typeof gameClient.state>) {
    const scale = thermalParticleScale(this.thermalLevel);
    const cap = thermalEnemyCap(this.thermalLevel, 120);
    const seen = new Set<string>();
    const list: { id: string; x: number; y: number; boss: boolean; elite: boolean }[] =
      [];
    let count = 0;

    for (const e of state.enemies) {
      if (count >= cap) break;
      seen.add(e.id);
      count++;
      list.push({ id: e.id, x: e.x, y: e.y, boss: e.boss, elite: e.elite });

      let spr = this.enemySprites.get(e.id);
      const tex = `enemy_${e.typeId}`;
      if (!spr) {
        spr = this.enemyPool!.acquire(tex, e.x, e.y);
        this.enemySprites.set(e.id, spr);
        this.enemyKey.set(e.id, tex);
        this.enemyPrev.set(e.id, { x: e.x, y: e.y });
      }
      const prev = this.enemyPrev.get(e.id);
      const enemyMoving = prev
        ? Math.hypot(e.x - prev.x, e.y - prev.y) > 1.5
        : false;
      this.enemyPrev.set(e.id, { x: e.x, y: e.y });

      spr.setPosition(e.x, e.y);
      spr.setScale(
        enemyDisplayScale(e.typeId, { boss: e.boss, elite: e.elite }) * scale
      );
      spr.setDepth(5 + e.y * 0.001);
      playEnemyAnim(spr, tex, enemyMoving);
      this.vfx?.tintEnemySprite(spr, e.typeId, e.hp / e.maxHp, e.boss, e.elite);

      const prevHp = this.enemyHp.get(e.id);
      if (prevHp !== undefined && e.hp < prevHp - 0.5) {
        const dmg = prevHp - e.hp;
        this.vfx?.spawnHitSpark(e.x, e.y);
        const cam = this.cameras.main;
        audioManager.playSpatialHit(e.x, e.y, cam.scrollX + cam.width / 2, cam.scrollY + cam.height / 2);
        this.queueDamageText(e.id, e.x, e.y, dmg, performance.now());
      }
      this.enemyHp.set(e.id, e.hp);
    }

    this.flushDamageTexts(performance.now());
    this.vfx?.trackEnemies(list);

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
  }

  /** Aggregate per-enemy damage texts so bullet-heaven DPS doesn't spam the screen */
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

  private syncPickups(state: NonNullable<typeof gameClient.state>) {
    const seen = new Set<string>();
    for (const gem of state.pickups) {
      seen.add(gem.id);
      let spr = this.pickupSprites.get(gem.id);
      if (!spr) {
        spr = this.pickupPool!.acquire("pickup_xp", gem.x, gem.y);
        this.pickupSprites.set(gem.id, spr);
      }
      spr.setPosition(gem.x, gem.y);
      playPickupAnim(spr);
      const baseScale = pickupDisplayScale();
      spr.setScale(baseScale * (1 + Math.sin(this.time.now * 0.012 + gem.x) * 0.12));
      this.vfx?.pulsePickup(spr, this.time.now);
    }
    for (const [id, spr] of this.pickupSprites) {
      if (!seen.has(id)) {
        this.pickupPool!.release("pickup_xp", spr);
        this.pickupSprites.delete(id);
      }
    }
  }

  shutdown() {
    this.enemyPool?.drain();
    this.pickupPool?.drain();
  }
}
