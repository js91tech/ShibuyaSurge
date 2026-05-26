import { Room, Client } from "colyseus";
import {
  CHARACTERS,
  ENEMIES,
  TRASH_ENEMY_IDS,
  RUN_DURATION_SEC,
  MAX_PLAYERS,
  REVIVE_CHANNEL_SEC,
  MAX_DOWNS,
  xpToLevel,
  LEVEL_SLOW_FACTOR,
  ENEMY_CAPS,
  spawnRate,
  getDraftOptions,
} from "@jjk/game-core";
import {
  GameRoomState,
  PlayerState,
  EnemyState,
  PickupState,
  TechniqueSlot,
  type JoinOptions,
  type PlayerInput,
  InputActions,
} from "@jjk/shared-protocol";
import { verifyInstanceParticipant } from "../discord.js";

const TICK_MS = 50;
const SPAWN_RADIUS = 900;

let enemyIdCounter = 0;
let pickupIdCounter = 0;

export class ShibuyaRoom extends Room<GameRoomState> {
  maxClients = MAX_PLAYERS;
  private tickInterval?: ReturnType<typeof setInterval>;
  private hostSessionId?: string;
  private reviveProgress = new Map<string, number>();
  private bannedTechniques = new Map<string, Set<string>>();
  private rerollsRemaining = new Map<string, number>();
  private banishesRemaining = new Map<string, number>();
  private bossSpecialCd = 8;
  private readyTimer?: ReturnType<typeof setTimeout>;
  /** Per-player per-technique cooldown timers (sec). Map<sessionId, Map<techId, sec>> */
  private techCooldowns = new Map<string, Map<string, number>>();
  /** Per-player invulnerability timers (sec) after taking contact damage. */
  private invulnSec = new Map<string, number>();
  /** Per-player seconds since last damage taken — for out-of-combat regen. */
  private outOfCombatSec = new Map<string, number>();

  private static readonly TECH_COOLDOWNS: Record<string, number> = {
    divergent_fist: 0.7,
    blue_pull: 1.0,
    red_push: 0.85,
    divine_dogs: 0.6,
    nue_bomb: 1.7,
    straw_doll: 0.55,
    hollow_purple: 2.9,
  };
  private static readonly PASSIVE_TECHS = new Set<string>([
    "black_flash",
    "resonance",
    "cursed_energy_regen",
    "movement_speed",
    "domain_expansion",
  ]);

  onCreate(options: { instanceId?: string }) {
    this.setState(new GameRoomState());
    this.state.instanceId = options?.instanceId ?? this.roomId;
    this.state.phase = "lobby";
    this.autoDispose = false;
  }

  async onAuth(_client: Client, options: JoinOptions) {
    if (!options?.instanceId || !options?.discordUserId) {
      throw new Error("Missing join options (instanceId, discordUserId)");
    }
    const valid = await verifyInstanceParticipant(
      options.accessToken ?? "",
      options.instanceId,
      options.discordUserId
    );
    if (!valid) {
      console.warn(
        `[room] auth rejected user=${options.discordUserId} instance=${options.instanceId}`
      );
      throw new Error("Not in Activity instance");
    }
    return options;
  }

  onJoin(client: Client, options: JoinOptions) {
    const char = CHARACTERS[options.characterId] ?? CHARACTERS.yuji;
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.discordUserId = options.discordUserId;
    player.username = options.username;
    player.characterId = char.id;
    player.maxHp = char.maxHp;
    player.hp = char.maxHp;
    player.x = (Math.random() - 0.5) * 200;
    player.y = (Math.random() - 0.5) * 200;

    const starter = new TechniqueSlot();
    starter.id = char.starterTechnique;
    starter.level = 1;
    player.techniques.push(starter);

    this.state.players.set(client.sessionId, player);

    if (!this.hostSessionId) this.hostSessionId = client.sessionId;

    client.send("joined", { sessionId: client.sessionId, host: this.hostSessionId });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.techCooldowns.delete(client.sessionId);
    this.bannedTechniques.delete(client.sessionId);
    this.rerollsRemaining.delete(client.sessionId);
    this.banishesRemaining.delete(client.sessionId);
    this.reviveProgress.delete(client.sessionId);
    this.invulnSec.delete(client.sessionId);
    this.outOfCombatSec.delete(client.sessionId);
    if (this.hostSessionId === client.sessionId) {
      const next = [...this.state.players.keys()][0];
      this.hostSessionId = next;
    }
    if (this.state.phase === "run" && this.state.players.size === 0) {
      this.endRun("abandoned");
    }
  }

  // @ts-expect-error - intentional override; base signature is the (type, callback) registration API but this room dispatches inline via the Colyseus 0.14-style (client, type, data) hook. See FIXME in deploy notes.
  onMessage(client: Client, type: string, data: unknown) {
    switch (type) {
      case "ready":
        this.setReady(client.sessionId, !!(data as { ready?: boolean }).ready);
        break;
      case "select_character":
        this.selectCharacter(client.sessionId, (data as { characterId: string }).characterId);
        break;
      case "start_run":
        if (client.sessionId === this.hostSessionId) this.startRun();
        break;
      case "input":
        this.applyInput(client.sessionId, data as PlayerInput);
        break;
      case "pick_upgrade":
        this.pickUpgrade(client.sessionId, (data as { techniqueId: string }).techniqueId);
        break;
      case "draft_reroll":
        this.draftReroll(client.sessionId);
        break;
      case "draft_banish":
        this.draftBanish(client.sessionId, (data as { techniqueId: string }).techniqueId);
        break;
      case "co_ping":
        this.broadcastPing(client.sessionId, data as { x: number; y: number; tag: string });
        break;
      case "ping":
        client.send("pong", data as { t?: number });
        break;
      default:
        break;
    }
  }

  private broadcastPing(
    sessionId: string,
    data: { x: number; y: number; tag: string }
  ) {
    const p = this.state.players.get(sessionId);
    this.broadcast("co_ping", {
      sessionId,
      username: p?.username ?? "Sorcerer",
      x: data.x,
      y: data.y,
      tag: data.tag,
    });
  }

  private draftReroll(sessionId: string) {
    if (this.state.draftingPlayerId !== sessionId) return;
    const remaining = this.rerollsRemaining.get(sessionId) ?? 1;
    if (remaining <= 0) return;
    this.rerollsRemaining.set(sessionId, remaining - 1);
    const p = this.state.players.get(sessionId);
    if (!p) return;
    this.refillDraft(p);
  }

  private draftBanish(sessionId: string, techniqueId: string) {
    if (this.state.draftingPlayerId !== sessionId) return;
    const remaining = this.banishesRemaining.get(sessionId) ?? 1;
    if (remaining <= 0) return;
    this.banishesRemaining.set(sessionId, remaining - 1);
    const banned = this.bannedTechniques.get(sessionId) ?? new Set<string>();
    banned.add(techniqueId);
    this.bannedTechniques.set(sessionId, banned);
    const p = this.state.players.get(sessionId);
    if (!p) return;
    this.refillDraft(p);
  }

  private refillDraft(p: PlayerState) {
    this.state.draftOptions.clear();
    const ownedLevels: Record<string, number> = {};
    for (const t of p.techniques) ownedLevels[t.id] = t.level;
    const banned = this.bannedTechniques.get(p.sessionId) ?? new Set<string>();
    const options = getDraftOptions([], p.characterId, ownedLevels, 3).filter(
      (o) => !banned.has(o)
    );
    for (const o of options) this.state.draftOptions.push(o);
  }

  private setReady(sessionId: string, ready: boolean) {
    const p = this.state.players.get(sessionId);
    if (p) p.ready = ready;
    this.maybeStartReadyTimer();
  }

  private maybeStartReadyTimer() {
    if (this.state.phase !== "lobby") return;
    const players = [...this.state.players.values()];
    const allReady = players.length > 0 && players.every((p) => p.ready);
    if (allReady && players.length >= 2) {
      if (this.readyTimer) return;
      this.broadcast("ready_countdown", { secs: 3 });
      this.readyTimer = setTimeout(() => {
        this.readyTimer = undefined;
        const stillAll = [...this.state.players.values()].every((p) => p.ready);
        if (stillAll && this.state.phase === "lobby") this.startRun();
      }, 3000);
    } else if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = undefined;
      this.broadcast("ready_countdown", { secs: 0 });
    }
  }

  private selectCharacter(sessionId: string, characterId: string) {
    if (this.state.phase !== "lobby") return;
    const char = CHARACTERS[characterId];
    if (!char) return;
    const p = this.state.players.get(sessionId);
    if (!p) return;
    p.characterId = char.id;
    p.maxHp = char.maxHp;
    p.hp = char.maxHp;
    p.techniques.clear();
    const starter = new TechniqueSlot();
    starter.id = char.starterTechnique;
    starter.level = 1;
    p.techniques.push(starter);
  }

  private startRun() {
    if (this.state.phase !== "lobby") return;
    const players = [...this.state.players.values()];
    if (players.length === 0) return;

    this.state.phase = "run";
    this.state.elapsed = 0;
    this.state.wave = 1;
    this.state.runEnded = false;
    this.state.enemies.clear();
    this.state.pickups.clear();
    this.state.bossSpawned = false;
    this.state.exorcismCount = 0;
    enemyIdCounter = 0;
    pickupIdCounter = 0;
    this.invulnSec.clear();
    this.outOfCombatSec.clear();
    this.techCooldowns.clear();

    for (const p of players) {
      p.ready = false;
      p.downed = false;
      p.spectating = false;
      p.downCount = 0;
      p.domainUsed = false;
      p.domainActive = false;
      p.x = (Math.random() - 0.5) * 100;
      p.y = (Math.random() - 0.5) * 100;
    }

    this.bannedTechniques.clear();
    this.rerollsRemaining.clear();
    this.banishesRemaining.clear();
    for (const p of players) {
      this.rerollsRemaining.set(p.sessionId, 1);
      this.banishesRemaining.set(p.sessionId, 1);
    }
    this.bossSpecialCd = 8;

    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => this.simTick(), TICK_MS);
  }

  private applyInput(sessionId: string, input: PlayerInput) {
    const p = this.state.players.get(sessionId);
    if (!p || p.downed || p.spectating || this.state.phase !== "run") return;

    const len = Math.hypot(input.moveX, input.moveY);
    if (len > 0.15) {
      p.moveX = input.moveX / len;
      p.moveY = input.moveY / len;
    } else {
      p.moveX = 0;
      p.moveY = 0;
    }
    p.aimAngle = input.aimAngle;

    if ((input.actions & InputActions.DOMAIN) && !p.domainUsed) {
      this.activateDomain(sessionId);
    }
  }

  private activateDomain(sessionId: string) {
    const anyActive = [...this.state.players.values()].some((pl) => pl.domainActive);
    if (anyActive) return;

    const p = this.state.players.get(sessionId);
    if (!p || p.domainUsed) return;

    p.domainUsed = true;
    p.domainActive = true;
    this.state.domainOwnerSessionId = sessionId;
    this.state.timeScale = 0.15;

    for (const e of this.state.enemies) {
      e.hp -= 40 + p.level * 8;
    }

    setTimeout(() => {
      p.domainActive = false;
      if (this.state.domainOwnerSessionId === sessionId) {
        this.state.domainOwnerSessionId = "";
      }
      if (![...this.state.players.values()].some((pl) => pl.choosingUpgrade)) {
        this.state.timeScale = 1;
      }
    }, 8000);
  }

  private simTick() {
    if (this.state.phase !== "run" || this.state.runEnded) return;

    const dt = (TICK_MS / 1000) * this.state.timeScale;
    this.state.elapsed += TICK_MS / 1000;

    const playerCount = this.state.players.size;
    const choosing = [...this.state.players.values()].some((p) => p.choosingUpgrade);
    if (choosing) this.state.timeScale = LEVEL_SLOW_FACTOR;
    else if (![...this.state.players.values()].some((p) => p.domainActive)) {
      this.state.timeScale = 1;
    }

    this.movePlayers(dt);
    this.handleRevives(dt);
    this.autoAttack(dt);
    this.spawnEnemies(dt, playerCount);
    this.moveEnemies(dt);
    this.enemyContactDamage();
    this.collectPickups();
    this.updateCamera();

    if (this.state.elapsed >= 180 && !this.state.bossSpawned) {
      this.spawnBoss();
    }

    if (this.state.bossSpawned) this.tickBossSpecials(dt);

    if (this.state.bossSpawned && this.state.bossHp <= 0) {
      this.endRun("victory");
    }

    if (this.state.elapsed >= RUN_DURATION_SEC && !this.state.bossSpawned) {
      this.spawnBoss();
    }

    if (this.state.elapsed >= RUN_DURATION_SEC + 120) {
      this.endRun("timeout");
    }
  }

  private movePlayers(dt: number) {
    for (const p of this.state.players.values()) {
      if (p.downed || p.spectating || p.choosingUpgrade) continue;
      const char = CHARACTERS[p.characterId] ?? CHARACTERS.yuji;
      let speed = char.speed;
      const moveTech = [...p.techniques].find((t) => t?.id === "movement_speed");
      if (moveTech) speed *= 1 + moveTech.level * 0.06;

      p.x += p.moveX * speed * dt;
      p.y += p.moveY * speed * dt;
      // World is intentionally unbounded — the client floor tiles forever
      // and spawn/scenery is computed relative to each player, so there's
      // no edge to "fall off". The previous ±ARENA/2 clamp behaved like
      // an invisible wall players could walk into.
    }
  }

  private handleRevives(dt: number) {
    for (const p of this.state.players.values()) {
      if (!p.downed) continue;

      let reviver: PlayerState | undefined;
      for (const other of this.state.players.values()) {
        if (other.sessionId === p.sessionId || other.downed || other.spectating) continue;
        const d = Math.hypot(other.x - p.x, other.y - p.y);
        if (d < 80) reviver = other;
      }

      const key = p.sessionId;
      if (reviver) {
        const prog = (this.reviveProgress.get(key) ?? 0) + dt;
        this.reviveProgress.set(key, prog);
        p.reviveProgress = prog;
        if (prog >= REVIVE_CHANNEL_SEC) {
          p.downed = false;
          p.hp = Math.floor(p.maxHp * 0.4);
          p.reviveProgress = 0;
          this.reviveProgress.delete(key);
          this.broadcast("player_revived", { sessionId: p.sessionId, username: p.username });
        }
      } else {
        p.reviveProgress = 0;
        this.reviveProgress.delete(key);
      }
    }
  }

  private autoAttack(dt: number) {
    for (const p of this.state.players.values()) {
      if (p.downed || p.spectating) continue;
      const char = CHARACTERS[p.characterId];
      if (!char) continue;

      let cds = this.techCooldowns.get(p.sessionId);
      if (!cds) {
        cds = new Map();
        this.techCooldowns.set(p.sessionId, cds);
      }

      // Black Flash → crit chance; Cursed Energy Flow → faster cadence.
      let critChance = 0;
      let cadenceMul = 1;
      for (const tech of p.techniques) {
        if (tech.id === "black_flash") critChance = Math.min(0.4, 0.08 * tech.level);
        else if (tech.id === "cursed_energy_regen") cadenceMul = 1 / (1 + tech.level * 0.08);
      }

      for (const tech of p.techniques) {
        if (ShibuyaRoom.PASSIVE_TECHS.has(tech.id)) continue;
        const baseCd = ShibuyaRoom.TECH_COOLDOWNS[tech.id];
        if (baseCd === undefined) continue;

        const remaining = (cds.get(tech.id) ?? 0) - dt;
        if (remaining > 0) {
          cds.set(tech.id, remaining);
          continue;
        }

        const baseDmg = 6 + tech.level * 3;
        const dmg = Math.random() < critChance ? baseDmg * 2.0 : baseDmg;
        const range = 80 + tech.level * 12;

        if (tech.id === "divergent_fist") {
          this.damageInRadius(p.x, p.y, range, dmg, p.aimAngle, false);
        } else if (tech.id === "blue_pull") {
          this.damageInRadius(p.x, p.y, range * 1.1, dmg, p.aimAngle, true);
        } else if (tech.id === "red_push") {
          this.damageInRadius(p.x, p.y, range * 1.2, dmg * 1.3, p.aimAngle, false);
        } else if (tech.id === "divine_dogs") {
          this.damageNearest(p.x, p.y, range * 1.5, dmg);
          this.damageNearest(p.x, p.y, range * 1.5, dmg);
        } else if (tech.id === "nue_bomb") {
          this.damageInRadius(p.x, p.y, range * 1.8, dmg * 1.4, p.aimAngle, false);
        } else if (tech.id === "straw_doll") {
          this.damageNearest(p.x, p.y, range * 1.8, dmg * 0.75);
          this.damageNearest(p.x, p.y, range * 1.8, dmg * 0.75);
          this.damageNearest(p.x, p.y, range * 1.8, dmg * 0.75);
        } else if (tech.id === "hollow_purple") {
          this.damageInRadius(p.x, p.y, range * 2.0, dmg * 2.0, p.aimAngle, false);
        }

        cds.set(tech.id, baseCd * cadenceMul);
      }
    }
  }

  private damageInRadius(
    x: number,
    y: number,
    range: number,
    dmg: number,
    angle: number,
    pull: boolean
  ) {
    for (const e of this.state.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;

      const dirAngle = Math.atan2(dy, dx);
      const diff = Math.abs(((dirAngle - angle + Math.PI) % (2 * Math.PI)) - Math.PI);
      if (diff > Math.PI / 2 && !pull) continue;

      e.hp -= dmg;
      if (pull) {
        e.x -= (dx / dist) * 3;
        e.y -= (dy / dist) * 3;
      }
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  private damageNearest(x: number, y: number, range: number, dmg: number) {
    let nearest: EnemyState | null = null;
    let best = range;
    for (const e of this.state.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < best) {
        best = d;
        nearest = e;
      }
    }
    if (nearest) {
      nearest.hp -= dmg;
      if (nearest.hp <= 0) this.killEnemy(nearest);
    }
  }

  private killEnemy(e: EnemyState) {
    const def = ENEMIES[e.typeId];
    this.state.exorcismCount += 1;

    const pickup = new PickupState();
    pickup.id = `p${pickupIdCounter++}`;
    pickup.x = e.x;
    pickup.y = e.y;
    pickup.value = def?.xp ?? 2;
    this.state.pickups.push(pickup);

    const idx = this.state.enemies.indexOf(e);
    if (idx >= 0) this.state.enemies.splice(idx, 1);

    if (e.boss) {
      this.state.bossHp = 0;
    }
  }

  private spawnEnemies(dt: number, playerCount: number) {
    if (this.state.enemies.length >= ENEMY_CAPS.trash) return;

    const rate = spawnRate(this.state.elapsed, playerCount) * dt;
    if (Math.random() > rate) return;

    const centroid = this.getCentroid();
    const typeId = TRASH_ENEMY_IDS[Math.floor(Math.random() * TRASH_ENEMY_IDS.length)];
    const def = ENEMIES[typeId];
    if (!def) return;

    const angle = Math.random() * Math.PI * 2;
    const enemy = new EnemyState();
    enemy.id = `e${enemyIdCounter++}`;
    enemy.typeId = typeId;
    enemy.x = centroid.x + Math.cos(angle) * SPAWN_RADIUS;
    enemy.y = centroid.y + Math.sin(angle) * SPAWN_RADIUS;
    enemy.hp = def.hp * (1 + playerCount * 0.15);
    enemy.maxHp = enemy.hp;
    this.state.enemies.push(enemy);

    if (this.state.elapsed > 60 && Math.random() < 0.002 * playerCount) {
      this.spawnElite(centroid);
    }
  }

  private spawnElite(centroid: { x: number; y: number }) {
    const types = ["elite_grade1", "elite_grade2", "elite_grade3"] as const;
    const typeId = types[Math.floor(Math.random() * types.length)];
    const def = ENEMIES[typeId];
    const enemy = new EnemyState();
    enemy.id = `e${enemyIdCounter++}`;
    enemy.typeId = typeId;
    enemy.elite = true;
    enemy.x = centroid.x + (Math.random() - 0.5) * 400;
    enemy.y = centroid.y + (Math.random() - 0.5) * 400;
    enemy.hp = def.hp;
    enemy.maxHp = def.hp;
    this.state.enemies.push(enemy);
  }

  private tickBossSpecials(dt: number) {
    const boss = this.state.enemies.find((e) => e.boss);
    if (!boss) return;
    this.bossSpecialCd -= dt;
    if (this.bossSpecialCd > 0) return;
    const target = this.getCentroid();
    const radius = this.state.bossPhase >= 2 ? 220 : 180;
    const dur = this.state.bossPhase >= 2 ? 900 : 1300;
    const dmg = this.state.bossPhase >= 2 ? 28 : 22;
    const tx = target.x + (Math.random() - 0.5) * 140;
    const ty = target.y + (Math.random() - 0.5) * 140;

    this.broadcast("boss_telegraph", { x: tx, y: ty, durationMs: dur, label:
      this.state.bossPhase >= 2 ? "FLAME BURST!" : "ERUPTION" });

    setTimeout(() => {
      if (this.state.phase !== "run") return;
      for (const p of this.state.players.values()) {
        if (p.downed || p.spectating) continue;
        if (Math.hypot(p.x - tx, p.y - ty) < radius) {
          p.hp -= dmg;
          if (p.hp <= 0) this.downPlayer(p);
        }
      }
    }, dur);

    this.bossSpecialCd = this.state.bossPhase >= 2 ? 5.5 : 8;
  }

  private spawnBoss() {
    if (this.state.bossSpawned) return;
    const def = ENEMIES.boss_jogo;
    const c = this.getCentroid();
    const enemy = new EnemyState();
    enemy.id = `boss${enemyIdCounter++}`;
    enemy.typeId = "boss_jogo";
    enemy.boss = true;
    enemy.x = c.x;
    enemy.y = c.y - 200;
    const scale = 1 + this.state.players.size * 0.5;
    enemy.hp = def.hp * scale;
    enemy.maxHp = enemy.hp;
    this.state.bossSpawned = true;
    this.state.bossHp = enemy.hp;
    this.state.bossMaxHp = enemy.maxHp;
    this.state.bossPhase = 1;
    this.state.enemies.push(enemy);
    this.broadcast("boss_spawn");
  }

  private moveEnemies(dt: number) {
    const players = [...this.state.players.values()].filter(
      (p) => !p.downed && !p.spectating
    );
    if (!players.length) return;

    for (const e of this.state.enemies) {
      const def = ENEMIES[e.typeId];
      if (!def) continue;

      let target = players[0];
      let best = Infinity;
      for (const p of players) {
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < best) {
          best = d;
          target = p;
        }
      }

      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * def.speed * dt;
      e.y += (dy / dist) * def.speed * dt;

      if (e.boss && e.hp < e.maxHp * 0.5 && this.state.bossPhase === 1) {
        this.state.bossPhase = 2;
        this.broadcast("boss_phase2");
      }
      if (e.boss) this.state.bossHp = e.hp;
    }
  }

  private enemyContactDamage() {
    const dt = TICK_MS / 1000;
    // Tick invulnerability + out-of-combat counters and apply contact damage
    // with a brief i-frame so multi-enemy stacks don't instakill.
    const dpsByPlayer = new Map<string, number>();
    for (const e of this.state.enemies) {
      const def = ENEMIES[e.typeId];
      if (!def) continue;
      for (const p of this.state.players.values()) {
        if (p.downed || p.spectating) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < def.radius + 16) {
          dpsByPlayer.set(p.sessionId, (dpsByPlayer.get(p.sessionId) ?? 0) + def.damage);
        }
      }
      if (e.typeId === "exploder" && e.hp < e.maxHp * 0.3) {
        this.killEnemy(e);
      }
    }

    for (const p of this.state.players.values()) {
      if (p.downed || p.spectating) continue;
      const dps = dpsByPlayer.get(p.sessionId) ?? 0;
      let inv = this.invulnSec.get(p.sessionId) ?? 0;
      let outOfCombat = this.outOfCombatSec.get(p.sessionId) ?? 0;
      if (inv > 0) inv = Math.max(0, inv - dt);

      if (dps > 0) {
        outOfCombat = 0;
        if (inv <= 0) {
          p.hp -= dps * dt;
          inv = 0.35;
          if (p.hp <= 0) {
            p.hp = 0;
            this.downPlayer(p);
          }
        }
      } else {
        outOfCombat += dt;
        if (outOfCombat > 4 && p.hp > 0 && p.hp < p.maxHp) {
          const regenPerSec = 1 + p.level * 0.4;
          p.hp = Math.min(p.maxHp, p.hp + regenPerSec * dt);
        }
      }
      this.invulnSec.set(p.sessionId, inv);
      this.outOfCombatSec.set(p.sessionId, outOfCombat);
    }
  }

  private downPlayer(p: PlayerState) {
    p.downCount += 1;
    if (p.downCount >= MAX_DOWNS) {
      p.spectating = true;
      p.downed = true;
    } else {
      p.downed = true;
      p.hp = 0;
    }
    this.broadcast("player_downed", { sessionId: p.sessionId, username: p.username });
  }

  private collectPickups() {
    for (const p of this.state.players.values()) {
      if (p.downed || p.spectating) continue;

      for (let i = this.state.pickups.length - 1; i >= 0; i--) {
        const gem = this.state.pickups[i];
        if (!gem) continue;
        const d = Math.hypot(p.x - gem.x, p.y - gem.y);
        if (d < 120) {
          const share = gem.value / this.state.players.size;
          this.grantXp(p, share);
          this.state.pickups.splice(i, 1);
        } else if (d < 200) {
          gem.x += (p.x - gem.x) * 0.08;
          gem.y += (p.y - gem.y) * 0.08;
        }
      }
    }
  }

  private grantXp(p: PlayerState, amount: number) {
    const prevLevel = p.level;
    p.xp += amount;
    // Scaled XP→level curve: each level costs ~15% more than the last so
    // mid-/late-game requires committed clears instead of feeling instant.
    p.level = xpToLevel(p.xp);
    if (p.level > prevLevel) this.offerDraft(p);
  }

  private offerDraft(p: PlayerState) {
    p.choosingUpgrade = true;
    this.state.draftingPlayerId = p.sessionId;
    this.refillDraft(p);
    this.state.timeScale = LEVEL_SLOW_FACTOR;
  }

  private pickUpgrade(sessionId: string, techniqueId: string) {
    if (this.state.draftingPlayerId !== sessionId) return;
    const p = this.state.players.get(sessionId);
    if (!p) return;

    const existing = [...p.techniques].find((t) => t?.id === techniqueId);
    if (existing) {
      existing.level += 1;
    } else {
      const slot = new TechniqueSlot();
      slot.id = techniqueId;
      slot.level = 1;
      p.techniques.push(slot);
    }

    p.choosingUpgrade = false;
    this.state.draftingPlayerId = "";
    this.state.draftOptions.clear();
    this.broadcast("level_up", { sessionId, level: p.level });

    if (![...this.state.players.values()].some((pl) => pl.choosingUpgrade)) {
      this.state.timeScale = 1;
    }
  }

  private getCentroid() {
    const active = [...this.state.players.values()].filter(
      (p) => !p.spectating
    );
    if (!active.length) return { x: 0, y: 0 };
    const x = active.reduce((s, p) => s + p.x, 0) / active.length;
    const y = active.reduce((s, p) => s + p.y, 0) / active.length;
    return { x, y };
  }

  private updateCamera() {
    const c = this.getCentroid();
    this.state.cameraX = c.x;
    this.state.cameraY = c.y;

    let maxSpread = 0;
    for (const p of this.state.players.values()) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d > maxSpread) maxSpread = d;
    }
    this.state.cameraZoom = Math.min(1.4, 1 + maxSpread / 600);
  }

  private endRun(reason: string) {
    if (this.state.runEnded) return;
    this.state.runEnded = true;
    this.state.phase = "results";
    if (this.tickInterval) clearInterval(this.tickInterval);

    const grade = this.calcGrade();
    this.state.grade = grade;
    this.broadcast("run_end", { reason, grade });
  }

  private calcGrade() {
    const count = this.state.exorcismCount;
    if (count > 400) return "Special Grade";
    if (count > 250) return "Grade 1";
    if (count > 120) return "Grade 2";
    return "Grade 3";
  }

  onDispose() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }
}
