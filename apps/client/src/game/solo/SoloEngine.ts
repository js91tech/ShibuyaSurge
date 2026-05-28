import {
  CHARACTERS,
  ENEMIES,
  TRASH_ENEMY_IDS,
  RUN_DURATION_SEC,
  levelFromXp,
  REVIVE_CHANNEL_SEC,
  MAX_DOWNS,
  BOSS_IDS,
  spawnRate,
  getDraftOptions,
  TECHNIQUES,
  applyEvolutionsToLoadout,
  activeSynergies,
  applyMutators,
  NEUTRAL_EFFECTS as NEUTRAL_MUTATORS,
  getStage,
  DEFAULT_STAGE,
  type MutatorEffects,
  type MutatorId,
  type StageId,
  type StageDef,
  type CharacterId,
  type TechniqueId,
  type SynergyPair,
} from "@jjk/game-core";
import { eventBus } from "../eventBus";
import { EMPTY_EFFECTS, type UnlockEffects } from "../../meta/unlocks";
import { ReplayBuffer, type ReplayFrame } from "./replayBuffer";

export type SoloPhase = "lobby" | "run" | "paused" | "results";

export interface SoloEnemy {
  id: string;
  typeId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  elite: boolean;
  boss: boolean;
}

export type PickupKind = "xp" | "health" | "bomb";

export interface SoloPickup {
  id: string;
  x: number;
  y: number;
  value: number;
  kind: PickupKind;
}

export type ProjectileKind =
  | "hammer"
  | "nail"
  | "dog"
  | "nue"
  | "fist"
  | "blue"
  | "red"
  | "beam"
  // ── Maki ─────────────────────────────────────────────────────────
  | "spear" // basic, throws + boomerangs
  | "kunai" // chained kunai cone
  | "slash_wave" // invisible afterimage / Zenin Massacre
  | "cleaver_arc" // Dragon-Bone evolution crescent
  // ── Toge ─────────────────────────────────────────────────────────
  | "speech_ring" // expanding kana ring
  | "sigil" // floating kanji sigil
  | "forbidden_word" // battlefield kanji command
  // ── Yuta ─────────────────────────────────────────────────────────
  | "katana_arc" // basic crescent
  | "rika_fist" // Rika manifestation throw
  | "mini_rika" // small homing crit bite
  | "love_beam_seg" // ultimate beam segment
  // ── Nobara ───────────────────────────────────────────────────────
  | "embed_nail" // basic — embeds at impact, detonates after delay
  | "floating_doll" // autonomous straw doll (elite passive)
  | "nail_rupture" // huge black-red explosion (evolution / hairpin)
  // ── Megumi ───────────────────────────────────────────────────────
  | "dash_wolf" // basic — homing wolf that bites then dissolves
  | "shadow_frog" // secondary — leaping frog with tongue pull
  | "shadow_pool" // static slow zone (Chimera Garden)
  | "shadow_beast" // evolution — giant fused beast
  // ── Gojo ─────────────────────────────────────────────────────────
  | "purple_orb" // Hollow Purple super-orb
  | "void_eye" // Unlimited Void cosmic eye
  // ── Yuji ─────────────────────────────────────────────────────────
  | "divergent_impact" // delayed cursed-energy second hit
  | "kick_wave" // Manji Kick spinning wave
  | "black_flash_crack"; // spatial crack on Black Flash crits

export interface SoloProjectile {
  id: string;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining lifetime in seconds. <=0 means cull. */
  life: number;
  /** Total lifetime (for animation interpolation). */
  lifeMax: number;
  damage: number;
  /** Damage falloff scale per hit (so it can pierce multiple enemies). */
  pierce: number;
  /** Set of enemy IDs already hit so we don't re-damage same enemy. */
  hitIds: Set<string>;
  /** Visual angle in radians (for rotated sprites). */
  angle: number;
  /** Optional: when present, projectile is orbiting (Divine Dogs) around player. */
  orbit?: { angle: number; radius: number; speed: number };
  /** Optional: when present, projectile homes on the nearest enemy. */
  homing?: boolean;
  /** Marks a critical-hit projectile so renderer can buff its visuals. */
  crit?: boolean;
  /** Set by Big Shots passive — scales collision radius (and renderer size). */
  radiusMul?: number;
  /**
   * Maki's Split Spear Toss: when true, projectile reverses velocity once
   * `lifeMax/2` has elapsed and re-arms its hitIds so it can hit on return.
   * `returnDamageMul` boosts the return-hit damage (shockwave).
   */
  boomerang?: boolean;
  returnDamageMul?: number;
  /** Set after the boomerang has reversed so we only flip once. */
  returned?: boolean;
  /**
   * Delay (seconds) before the projectile becomes active. Used by Toge's
   * Don't Move sigils + Echo Wave + Explode delayed bursts. While `delay > 0`
   * the projectile keeps its anchor position and skips collision.
   */
  delay?: number;
  /** Anchor for delayed projectiles so they don't drift before activation. */
  anchorX?: number;
  anchorY?: number;
  /** Marks a projectile as a "summon" (Rika, mini-Rika) for passive scaling. */
  summon?: boolean;
  /**
   * Nobara — on first collision, the projectile stops, goes invisible to
   * the collision loop (pierce hits 0), and waits `delay` seconds to
   * detonate as an AoE. Hairpin force-resets that delay to 0 on cast.
   */
  embed?: boolean;
  /**
   * When `delay` reaches 0, the projectile performs an AoE damage burst at
   * its anchor position then despawns instead of becoming a regular
   * projectile. Used by embedded nails + Don't Move sigils.
   */
  explodeOnDelay?: boolean;
  /** Radius for the explode-on-delay burst (default 80). */
  explodeRadius?: number;
  /**
   * Megumi — projectile applies a slow + damage tick to enemies inside
   * `slowZone` radius every frame. Used by shadow_pool zones.
   */
  slowZone?: number;
  /** Marks the most recently-hit elite/boss for Nobara's Resonance link. */
  markTarget?: boolean;
}

export interface SoloTechnique {
  id: TechniqueId;
  level: number;
  /** Remaining cooldown (sec). 0 means ready. Undefined for passives. */
  cooldown?: number;
  /** Total cooldown (sec) for normalising progress UI. Undefined for passives. */
  cooldownMax?: number;
}

export interface RunTelemetry {
  maxStreak: number;
  dashesUsed: number;
  damageTaken: number;
  techDamage: Array<{ id: TechniqueId; damage: number }>;
  ultsFired: number;
  /** Damage in the last second — drives screen shake intensity. */
  recentDps: number;
}

export interface SoloSnapshot {
  phase: SoloPhase;
  elapsed: number;
  exorcismCount: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    xp: number;
    level: number;
    characterId: CharacterId;
    downed: boolean;
    downCount: number;
    spectating: boolean;
    domainUsed: boolean;
    domainActive: boolean;
    techniques: SoloTechnique[];
    choosingUpgrade: boolean;
    invulnSec: number;
    streak: number;
    streakMultiplier: number;
    dashCdSec: number;
    dashCdMax: number;
    regenActive: boolean;
    /** Ultimate energy (0..1). Filled by crits / kills / time. */
    ultPct: number;
    /** Whether the ultimate is currently active (visual / SFX hook). */
    ultActive: boolean;
  };
  /** Selected mutators for this run (display-only here; effects baked in). */
  mutatorIds: MutatorId[];
  stage: StageId;
  /** Active pair synergies (display in the HUD / draft tooltip). */
  synergies: SynergyPair[];
  /** Practice-mode dummy DPS rolling-10s reading. */
  practiceDps: number;
  enemies: SoloEnemy[];
  pickups: SoloPickup[];
  projectiles: SoloProjectile[];
  /** Transient impact points — populated this tick only, drained by renderer. */
  hits: Array<{ x: number; y: number; elite: boolean; crit: boolean }>;
  draftOptions: TechniqueId[];
  bossSpawned: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  grade: string;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  timeScale: number;
  telemetry: RunTelemetry;
}

type Listener = (snap: SoloSnapshot) => void;

let idCounter = 0;
const nextId = () => `e${idCounter++}`;

/** Pixel collision radius per projectile kind. Tuned to look fair on screen. */
function projectileRadius(kind: ProjectileKind): number {
  switch (kind) {
    case "hammer":
      return 26;
    case "nail":
      return 14;
    case "dog":
      return 28;
    case "nue":
      return 100;
    case "fist":
      return 30;
    case "blue":
      return 32;
    case "red":
      return 26;
    case "beam":
      return 18;
    // Maki
    case "spear":
      return 30;
    case "kunai":
      return 18;
    case "slash_wave":
      return 44;
    case "cleaver_arc":
      return 56;
    // Toge
    case "speech_ring":
      return 60;
    case "sigil":
      return 34;
    case "forbidden_word":
      return 90;
    // Yuta
    case "katana_arc":
      return 36;
    case "rika_fist":
      return 56;
    case "mini_rika":
      return 22;
    case "love_beam_seg":
      return 70;
    // Nobara
    case "embed_nail":
      return 16;
    case "floating_doll":
      return 22;
    case "nail_rupture":
      return 96;
    // Megumi
    case "dash_wolf":
      return 32;
    case "shadow_frog":
      return 28;
    case "shadow_pool":
      return 110;
    case "shadow_beast":
      return 80;
    // Gojo
    case "purple_orb":
      return 90;
    case "void_eye":
      return 200;
    // Yuji
    case "divergent_impact":
      return 56;
    case "kick_wave":
      return 60;
    case "black_flash_crack":
      return 72;
  }
}

export class SoloEngine {
  phase: SoloPhase = "lobby";
  characterId: CharacterId = "yuji";
  elapsed = 0;
  exorcismCount = 0;
  x = 0;
  y = 0;
  hp = 100;
  maxHp = 100;
  xp = 0;
  level = 1;
  moveX = 0;
  moveY = 0;
  aimAngle = 0;
  downed = false;
  downCount = 0;
  spectating = false;
  domainUsed = false;
  domainActive = false;
  domainTimer = 0;
  techniques: SoloTechnique[] = [];
  choosingUpgrade = false;
  draftOptions: TechniqueId[] = [];
  enemies: SoloEnemy[] = [];
  pickups: SoloPickup[] = [];
  projectiles: SoloProjectile[] = [];
  bossSpawned = false;
  bossHp = 0;
  bossMaxHp = 0;
  bossPhase = 1;
  grade = "";
  timeScale = 1;
  reviveProgress = 0;
  effects: UnlockEffects = EMPTY_EFFECTS;
  practiceMode = false;
  domainEverUsed = false;
  bossDefeated = false;
  bannedTechniques = new Set<TechniqueId>();
  rerollsRemaining = 1;
  banishesRemaining = 1;
  private bossSpecialCooldown = 6;
  private tickHandle?: ReturnType<typeof setInterval>;
  private listeners = new Set<Listener>();
  private rng: () => number = Math.random;
  /** Per-technique cooldown timer in seconds — decremented each tick, reset on fire. */
  private techCooldowns: Partial<Record<TechniqueId, number>> = {};
  /** Impacts produced this tick — consumed by the renderer for sparks. */
  private hits: Array<{ x: number; y: number; elite: boolean; crit: boolean }> = [];
  /** Flag set during fireTechnique so spawnProjectile can mark the projectile as crit. */
  private pendingCrit = false;
  /** Track the currently-firing technique so we can tag projectiles by source. */
  private activeFireTech: TechniqueId | null = null;
  /** Reverse map projectile id -> source technique id for damage attribution. */
  private projectileSource: Map<string, TechniqueId> = new Map();
  /** Damage multiplier applied to elite/boss enemies (driven by Resonance). */
  private eliteDmgMul = 1;
  /** Rolling kill streak (resets after `STREAK_TIMEOUT_SEC` of no kills). */
  streak = 0;
  private streakDecaySec = 0;
  private lastStreakMul = 1;
  /** Run telemetry — totals shown on the results card. */
  maxStreak = 0;
  dashesUsed = 0;
  techDamage: Partial<Record<TechniqueId, number>> = {};
  /** Dash cooldown timer in seconds. */
  dashCdSec = 0;
  /** Dash duration counter (player can't be hit + moves quickly while > 0). */
  private dashDurSec = 0;
  private dashVx = 0;
  private dashVy = 0;
  /** Seconds of invulnerability remaining after taking damage. */
  private invulnSec = 0;
  /** Seconds since the player last took damage — used for out-of-combat regen. */
  private outOfCombatSec = 0;
  /** Total damage taken this run (for stats / achievements). */
  damageTakenTotal = 0;

  // ── Mutators & stage ────────────────────────────────────────────────
  mutatorIds: MutatorId[] = [];
  stageId: StageId = DEFAULT_STAGE;
  mutators: MutatorEffects = { ...NEUTRAL_MUTATORS };
  /** Cached stage def (palette + balance tweaks). */
  stageDef: StageDef | undefined;
  /** Techniques the player has unlocked via achievements / shop. */
  unlockedExtras: TechniqueId[] = [];

  // ── Ultimate ────────────────────────────────────────────────────────
  ultEnergy = 0;
  /** Max energy; reaching this unlocks the ultimate button. */
  readonly ultMax = 100;
  ultActive = false;
  private ultTimer = 0;
  private ultsFired = 0;

  // ── Replay buffer (Tier 2 #9, Tier 5 #18) ───────────────────────────
  private replay = new ReplayBuffer(4, 20);

  // ── Recent damage tracker (Tier 2 #6) ───────────────────────────────
  /** Rolling sum of damage dealt in the last `recentDamageWindow` seconds. */
  private recentDamage = 0;
  private recentDamageWindow = 1.0;
  private recentDamageDecayPerSec = 1 / 1.0;

  // ── Active synergies cache (refreshed on draft pick / run start) ────
  private synergies: SynergyPair[] = [];

  // ── Maki Predator Rage ───────────────────────────────────────────────
  /** Seconds remaining on the most recent kill-streak buff window. */
  private predatorRageSec = 0;
  /** How many kills are stacked in the current Rage window (capped to passive level). */
  private predatorRageStacks = 0;

  // ── Toge echo / explode queues ───────────────────────────────────────
  /** Scheduled echo re-fires: (techId, secondsRemaining, dmg, isCrit). */
  private pendingEchoes: Array<{
    techId: TechniqueId;
    timer: number;
    dmg: number;
    isCrit: boolean;
  }> = [];
  /** Toge "Explode." ultimate countdown — when >0 we draw a warning pulse. */
  private explodeTimer = 0;
  private explodeDmg = 0;

  // ── Yuta Love Beam channel ───────────────────────────────────────────
  /** Remaining ultimate-beam channel time (Yuta only). */
  private loveBeamTimer = 0;
  private loveBeamDmg = 0;

  /**
   * When true, the current fireTechnique invocation is the *echo* re-fire
   * for Toge — skip scheduling further echoes to avoid infinite recursion.
   */
  private firingEcho = false;

  // ── Nobara Resonance link ───────────────────────────────────────────
  /** Id of the elite/boss currently linked by Resonance (decays over time). */
  private markedEnemyId: string | null = null;
  private markedEnemyLinkSec = 0;

  // ── Yuji combo / Black Flash timing ─────────────────────────────────
  /** Combo count for Awakened Vessel + Black Flash cadence buff. */
  private comboCount = 0;
  private comboDecaySec = 0;
  /** Seconds of attack-speed buff after a Black Flash crit. */
  private blackFlashBuffSec = 0;

  // ── Gojo Unlimited Void countdown ───────────────────────────────────
  private voidTimer = 0;
  private voidDmg = 0;

  // ── Yuji Black Flash Barrage ────────────────────────────────────────
  private barrageTimer = 0;
  private barrageDmg = 0;
  private barrageHits = 0;

  // ── Nobara floating dolls firing cadence ────────────────────────────
  private floatingDollFireSec = 0;

  // ── Practice mode telemetry ─────────────────────────────────────────
  /** Damage dealt to practice dummies in the last `practiceDpsWindow`s. */
  private practiceDamage = 0;
  private practiceDpsWindow = 10;
  private practiceDps = 0;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const s = this.snapshot();
    for (const fn of this.listeners) fn(s);
  }

  snapshot(): SoloSnapshot {
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      exorcismCount: this.exorcismCount,
      player: {
        x: this.x,
        y: this.y,
        hp: this.hp,
        maxHp: this.maxHp,
        xp: this.xp,
        level: this.level,
        characterId: this.characterId,
        downed: this.downed,
        downCount: this.downCount,
        spectating: this.spectating,
        domainUsed: this.domainUsed,
        domainActive: this.domainActive,
        techniques: this.techniques.map((t) => {
          const baseCd = SoloEngine.TECH_COOLDOWNS[t.id];
          if (baseCd === undefined) return { id: t.id, level: t.level };
          return {
            id: t.id,
            level: t.level,
            cooldown: Math.max(0, this.techCooldowns[t.id] ?? 0),
            cooldownMax: baseCd,
          };
        }),
        choosingUpgrade: this.choosingUpgrade,
        invulnSec: this.invulnSec,
        streak: this.streak,
        streakMultiplier: this.streakMultiplier(),
        dashCdSec: this.dashCdSec,
        dashCdMax: 3,
        regenActive:
          !this.downed && this.outOfCombatSec > 4 && this.hp > 0 && this.hp < this.maxHp,
        ultPct: Math.max(0, Math.min(1, this.ultEnergy / this.ultMax)),
        ultActive: this.ultActive,
      },
      mutatorIds: this.mutatorIds.slice(),
      stage: this.stageId,
      synergies: this.synergies.slice(),
      practiceDps: this.practiceDps,
      enemies: this.enemies.map((e) => ({ ...e })),
      pickups: this.pickups.map((p) => ({ ...p })),
      projectiles: this.projectiles.map((p) => ({ ...p, hitIds: p.hitIds })),
      hits: this.hits,
      draftOptions: [...this.draftOptions],
      bossSpawned: this.bossSpawned,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      bossPhase: this.bossPhase,
      grade: this.grade,
      cameraX: this.x,
      cameraY: this.y,
      cameraZoom: 1,
      timeScale: this.timeScale,
      telemetry: {
        maxStreak: this.maxStreak,
        dashesUsed: this.dashesUsed,
        damageTaken: Math.round(this.damageTakenTotal),
        techDamage: Object.entries(this.techDamage)
          .map(([id, dmg]) => ({ id: id as TechniqueId, damage: Math.round(dmg ?? 0) }))
          .sort((a, b) => b.damage - a.damage),
        ultsFired: this.ultsFired,
        recentDps: this.recentDamage / this.recentDamageWindow,
      },
    };
  }

  setEffects(effects: UnlockEffects) {
    this.effects = effects;
  }

  setPracticeMode(on: boolean) {
    this.practiceMode = on;
  }

  /** Picked at the lobby / pre-run; consumed on startRun. */
  setRunConfig(mutatorIds: MutatorId[], stage: StageId, unlockedExtras: TechniqueId[]) {
    this.mutatorIds = mutatorIds.slice(0, 3);
    this.stageId = stage;
    this.stageDef = getStage(stage);
    this.unlockedExtras = unlockedExtras.slice();
    this.mutators = applyMutators(this.mutatorIds);
  }

  /** Drained by Results screen for the death-replay panel + export. */
  getReplayFrames(): ReplayFrame[] {
    return this.replay.toArray();
  }

  /** Seed the RNG for daily challenges */
  setSeed(seed: string | null) {
    if (!seed) {
      this.rng = Math.random;
      return;
    }
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
    let state = s || 1;
    this.rng = () => {
      state = (state * 1664525 + 1013904223) | 0;
      return ((state >>> 0) % 1_000_000) / 1_000_000;
    };
  }

  selectCharacter(id: CharacterId) {
    this.characterId = id;
    const c = CHARACTERS[id];
    this.maxHp = Math.round(c.maxHp * this.effects.hpMul);
    this.hp = this.maxHp;
    this.techniques = [{ id: c.starterTechnique as TechniqueId, level: 1 }];
    this.emit();
  }

  startRun() {
    const c = CHARACTERS[this.characterId];
    this.phase = "run";
    this.elapsed = 0;
    this.exorcismCount = 0;
    this.x = 0;
    this.y = 0;
    this.maxHp = Math.round(c.maxHp * this.effects.hpMul * this.mutators.maxHpMul);
    this.hp = this.maxHp;
    this.xp = 0;
    this.level = Math.max(1, this.mutators.startLevel || 1);
    this.downed = false;
    this.downCount = 0;
    this.spectating = false;
    this.domainUsed = false;
    this.domainActive = false;
    this.domainEverUsed = false;
    this.bossDefeated = false;
    this.choosingUpgrade = false;
    this.bannedTechniques.clear();
    this.rerollsRemaining = 1 + this.mutators.extraRerolls;
    this.banishesRemaining = 1;
    this.bossSpecialCooldown = 8;
    this.enemies = [];
    this.pickups = [];
    this.projectiles = [];
    this.projectileHitClear.clear();
    this.bossSpawned = false;
    this.bossPhase = 1;
    this.techniques = [{ id: c.starterTechnique as TechniqueId, level: 1 }];
    this.techCooldowns = {};
    // 2s spawn protection so the player isn't bodychecked at t=0.
    this.invulnSec = 2;
    this.outOfCombatSec = 0;
    this.damageTakenTotal = 0;
    this.streak = 0;
    this.streakDecaySec = 0;
    this.lastStreakMul = 1;
    this.maxStreak = 0;
    this.dashesUsed = 0;
    this.techDamage = {};
    this.projectileSource.clear();
    this.activeFireTech = null;
    this.dashCdSec = 0;
    this.dashDurSec = 0;
    this.ultEnergy = 0;
    this.ultActive = false;
    this.ultTimer = 0;
    this.ultsFired = 0;
    this.recentDamage = 0;
    this.practiceDamage = 0;
    this.practiceDps = 0;
    this.predatorRageSec = 0;
    this.predatorRageStacks = 0;
    this.pendingEchoes = [];
    this.explodeTimer = 0;
    this.explodeDmg = 0;
    this.loveBeamTimer = 0;
    this.loveBeamDmg = 0;
    this.markedEnemyId = null;
    this.markedEnemyLinkSec = 0;
    this.comboCount = 0;
    this.comboDecaySec = 0;
    this.blackFlashBuffSec = 0;
    this.voidTimer = 0;
    this.voidDmg = 0;
    this.barrageTimer = 0;
    this.barrageDmg = 0;
    this.barrageHits = 0;
    this.floatingDollFireSec = 0;
    this.replay.clear();
    this.synergies = activeSynergies(this.techniques.map((t) => t.id));
    idCounter = 0;

    if (this.practiceMode) this.spawnPracticeDummies();

    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => this.tick(), 50);
    this.emit();
  }

  /** Place three stationary practice dummies arranged around the player. */
  private spawnPracticeDummies() {
    const def = ENEMIES.tank;
    if (!def) return;
    const offsets: Array<[number, number]> = [
      [220, 0],
      [-220, 0],
      [0, -240],
    ];
    for (const [dx, dy] of offsets) {
      this.enemies.push({
        id: nextId(),
        typeId: "tank",
        x: this.x + dx,
        y: this.y + dy,
        hp: 1_000_000,
        maxHp: 1_000_000,
        elite: false,
        boss: false,
      });
    }
  }

  pause() {
    if (this.phase === "run") {
      this.phase = "paused";
      this.emit();
    }
  }

  resume() {
    if (this.phase === "paused") {
      this.phase = "run";
      this.emit();
    }
  }

  setInput(moveX: number, moveY: number, aimAngle: number) {
    this.moveX = moveX;
    this.moveY = moveY;
    this.aimAngle = aimAngle;
  }

  triggerDomain() {
    if (this.domainUsed || this.phase !== "run" || this.downed) return;
    this.domainUsed = true;
    this.domainEverUsed = true;
    this.domainActive = true;
    this.domainTimer = 8;
    this.timeScale = 0.15;
    const dmg =
      (40 + this.level * 8) * this.effects.domainMul * this.mutators.domainMul;
    for (const e of this.enemies) e.hp -= dmg;
    for (const e of this.enemies) if (e.hp <= 0 && !e.boss) this.exorcismCount++;
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    eventBus.emit({ kind: "domain", username: "You" });
    this.emit();
  }

  /**
   * Player's character-specific ultimate (Tier 2 #10). Costs the full
   * ultMax energy. Different per character; all of them are mid-power
   * panic buttons that complement (not replace) Domain.
   */
  triggerUltimate(): boolean {
    if (this.phase !== "run" || this.downed) return false;
    if (this.ultEnergy < this.ultMax || this.ultActive) return false;
    this.ultEnergy = 0;
    this.ultActive = true;
    this.ultTimer = 1.5;
    this.ultsFired += 1;
    eventBus.emit({ kind: "ultimate", character: this.characterId });

    const dmgPerEnemy = 50 + this.level * 6;
    switch (this.characterId) {
      case "yuji": {
        // Black Flash Barrage — open a 1.4s window during which fast
        // black-flash crack bursts chain into a final cinematic blast.
        const owns = this.techniques.find((t) => t.id === "black_flash_barrage");
        this.barrageTimer = owns ? 1.4 + owns.level * 0.3 : 1.0;
        this.barrageDmg = dmgPerEnemy * (owns ? 1.3 : 0.95);
        this.barrageHits = 0;
        this.blackFlashBuffSec = Math.max(this.blackFlashBuffSec, this.barrageTimer);
        // Open with a screen-shaking AoE around Yuji so the activation
        // reads immediately.
        this.damageRadiusFx(this.x, this.y, 280, dmgPerEnemy * 1.4, true);
        break;
      }
      case "megumi": {
        // Shadow Domain — endless shikigami strike from every direction.
        const owns = this.techniques.find((t) => t.id === "shadow_domain");
        // Mahoraga boost (legacy): elites take more damage during the ult.
        this.eliteDmgMul = Math.max(this.eliteDmgMul, owns ? 1.9 : 1.6);
        // Fan dashing wolves around the player.
        const wolves = owns ? 18 + owns.level * 4 : 12;
        for (let i = 0; i < wolves; i++) {
          const a = (i / wolves) * Math.PI * 2 + this.rng() * 0.3;
          this.spawnProjectile({
            kind: "dash_wolf",
            x: this.x + Math.cos(a) * 50,
            y: this.y + Math.sin(a) * 50,
            vx: Math.cos(a) * 620,
            vy: Math.sin(a) * 620,
            life: 0.9,
            damage: dmgPerEnemy * (owns ? 1.2 : 0.9),
            pierce: 4,
            angle: a,
            homing: true,
            summon: true,
          });
        }
        // Drop a giant shadow pool at Megumi's feet — sustained slow + DoT
        // for the duration.
        this.spawnProjectile({
          kind: "shadow_pool",
          x: this.x,
          y: this.y,
          vx: 0,
          vy: 0,
          life: 2.6,
          damage: dmgPerEnemy * 0.6,
          pierce: 0,
          angle: 0,
          slowZone: 260,
        });
        break;
      }
      case "nobara": {
        // Resonance Collapse — force-detonate every embedded nail
        // simultaneously, and spread a giant curse-web flash.
        const owns = this.techniques.find((t) => t.id === "resonance_collapse");
        const reach = owns ? 50 + 20 * owns.level : 0;
        for (const p of this.projectiles) {
          if (!p.embed || !p.explodeOnDelay || p.delay == null) continue;
          p.delay = 0;
          p.explodeRadius = (p.explodeRadius ?? 70) + 60 + reach;
          p.damage = Math.max(p.damage, dmgPerEnemy * 1.2);
        }
        // Web flash — screen-wide damage and visual nail rupture cluster.
        this.damageRadiusFx(this.x, this.y, 560, dmgPerEnemy * (owns ? 1.8 : 1.2), true);
        const ruptures = owns ? 8 : 6;
        for (let i = 0; i < ruptures; i++) {
          const a = (i / ruptures) * Math.PI * 2;
          const r = 160 + this.rng() * 220;
          this.spawnProjectile({
            kind: "nail_rupture",
            x: this.x + Math.cos(a) * r,
            y: this.y + Math.sin(a) * r,
            vx: 0,
            vy: 0,
            life: 0.5,
            damage: dmgPerEnemy * 1.3,
            pierce: 0,
            angle: 0,
            delay: 0.4,
            explodeOnDelay: true,
            explodeRadius: 150,
          });
        }
        break;
      }
      case "gojo": {
        // Unlimited Void — freeze the field, then detonate a massive
        // cosmic-eye psychic burst. Cinematic, the screen darkens via the
        // void_eye sprite + slow-mo timeScale.
        const owns = this.techniques.find((t) => t.id === "unlimited_void");
        this.voidTimer = owns ? 1.6 + owns.level * 0.3 : 1.1;
        this.voidDmg = dmgPerEnemy * (owns ? 4.0 : 2.6);
        this.spawnProjectile({
          kind: "void_eye",
          x: this.x,
          y: this.y,
          vx: 0,
          vy: 0,
          life: this.voidTimer + 0.4,
          damage: 0,
          pierce: 0,
          angle: 0,
          delay: this.voidTimer,
        });
        // Opening Hollow Purple sweep so the activation has bite.
        const aim = this.aimAngle;
        this.spawnProjectile({
          kind: "purple_orb",
          x: this.x + Math.cos(aim) * 60,
          y: this.y + Math.sin(aim) * 60,
          vx: Math.cos(aim) * 540,
          vy: Math.sin(aim) * 540,
          life: 1.4,
          damage: dmgPerEnemy * 1.6,
          pierce: 99,
          angle: aim,
        });
        break;
      }
      case "maki": {
        // Zenin Massacre — rapid invisible dash slashes across the screen.
        // We spawn a flurry of slash_wave projectiles radiating from Maki
        // in a 360° fan, with extra waves if the player picked the named
        // ultimate technique.
        const owns = this.techniques.find((t) => t.id === "zenin_massacre");
        const waves = (owns ? 22 : 14) + (owns?.level ?? 0) * 4;
        for (let i = 0; i < waves; i++) {
          const a = (i / waves) * Math.PI * 2 + this.rng() * 0.3;
          this.spawnProjectile({
            kind: "slash_wave",
            x: this.x + Math.cos(a) * 40,
            y: this.y + Math.sin(a) * 40,
            vx: Math.cos(a) * 900,
            vy: Math.sin(a) * 900,
            life: 0.55,
            damage: dmgPerEnemy * (owns ? 1.4 : 1.0),
            pierce: 99,
            angle: a,
          });
        }
        break;
      }
      case "toge": {
        // Explode. — schedule a screen-wide delayed nuke. The warning is the
        // floating kanji + delayed sound burst (handled in tickKitPassives).
        const owns = this.techniques.find((t) => t.id === "explode_word");
        const dmg = dmgPerEnemy * (owns ? 4.0 : 2.5);
        this.explodeTimer = 1.2;
        this.explodeDmg = dmg;
        // Drop a giant warning kanji on top of the player so the player can
        // anticipate the explosion.
        this.spawnProjectile({
          kind: "forbidden_word",
          x: this.x,
          y: this.y,
          vx: 0,
          vy: 0,
          life: 1.3,
          damage: 0,
          pierce: 0,
          angle: 0,
          delay: 1.2,
        });
        break;
      }
      case "yuta": {
        // Love Beam — open a continuous channel that fires beam segments
        // forward every tick from tickKitPassives. Owning the named
        // ultimate technique extends the channel and boosts damage.
        const owns = this.techniques.find((t) => t.id === "love_beam");
        this.loveBeamTimer = owns ? 1.8 + owns.level * 0.4 : 1.2;
        this.loveBeamDmg = dmgPerEnemy * (owns ? 1.2 : 0.9);
        // Immediate Rika manifestation pulse for the dramatic opening
        // frame — three giant fists radiate outward.
        for (let i = 0; i < 3; i++) {
          const a = this.aimAngle + (i - 1) * 0.35;
          this.spawnProjectile({
            kind: "rika_fist",
            x: this.x,
            y: this.y,
            vx: Math.cos(a) * 500,
            vy: Math.sin(a) * 500,
            life: 1.2,
            damage: dmgPerEnemy * 1.4,
            pierce: 4,
            angle: a,
            summon: true,
            homing: true,
          });
        }
        break;
      }
    }
    this.emit();
    return true;
  }

  /**
   * Toge — Echo Wave passive. After a speech technique fires we schedule a
   * cheaper re-fire 1.1s later. Damage falls off per passive level so the
   * ceiling stays sane.
   */
  private scheduleEcho(
    tech: SoloTechnique,
    dmg: number,
    isCrit: boolean
  ) {
    // Guard: the echo's re-fire calls fireTechnique which then calls back
    // here. Without this short-circuit, every echo would queue another echo
    // and we'd loop forever after a single Toge cast.
    if (this.firingEcho) return;
    const echo = this.techniques.find((t) => t.id === "echo_wave");
    if (!echo) return;
    this.pendingEchoes.push({
      techId: tech.id,
      timer: 1.1,
      dmg: dmg * (0.45 + 0.1 * echo.level),
      isCrit,
    });
  }

  /**
   * Yuji — combo timing. Every time he casts a melee technique the combo
   * count ticks up and refreshes the decay timer. Awakened Vessel and
   * Black Flash both read off `comboCount`.
   */
  private bumpCombo() {
    this.comboCount = Math.min(20, this.comboCount + 1);
    this.comboDecaySec = 2.0;
  }

  pickUpgrade(id: TechniqueId) {
    const ex = this.techniques.find((t) => t.id === id);
    if (ex) ex.level += 1;
    else this.techniques.push({ id, level: 1 });
    const before = this.techniques.map((t) => t.id);
    this.techniques = applyEvolutionsToLoadout(
      this.techniques,
      this.mutators.weaponMaxLevelBonus
    );
    for (const tid of this.techniques.map((t) => t.id)) {
      if (!before.includes(tid)) {
        const def = TECHNIQUES[tid];
        if (def) eventBus.emit({ kind: "info", message: `Evolution: ${def.name}` });
      }
    }
    this.choosingUpgrade = false;
    this.draftOptions = [];
    this.timeScale = 1;
    this.synergies = activeSynergies(this.techniques.map((t) => t.id));
    this.emit();
  }

  rerollDraft() {
    if (!this.choosingUpgrade || this.rerollsRemaining <= 0) return;
    this.rerollsRemaining--;
    this.refillDraftOptions();
  }

  banishDraft(id: TechniqueId) {
    if (!this.choosingUpgrade || this.banishesRemaining <= 0) return;
    this.banishesRemaining--;
    this.bannedTechniques.add(id);
    this.refillDraftOptions();
  }

  private refillDraftOptions() {
    const levels: Record<string, number> = {};
    for (const t of this.techniques) levels[t.id] = t.level;
    const opts = getDraftOptions(
      [],
      this.characterId,
      levels,
      this.mutators.draftOptionCount,
      this.unlockedExtras,
      {
        banPassive: this.mutators.banPassive,
        banWeapon: this.mutators.banWeapon,
        weaponMaxLevelBonus: this.mutators.weaponMaxLevelBonus,
      }
    );
    this.draftOptions = opts.filter((o) => !this.bannedTechniques.has(o));
    while (this.draftOptions.length < 1 && opts.length) {
      this.draftOptions = opts;
      break;
    }
    this.emit();
  }

  autoPickUpgrade() {
    if (this.draftOptions.length) this.pickUpgrade(this.draftOptions[0]);
  }

  private tick() {
    if (this.phase !== "run") return;

    const dt = 0.05 * this.timeScale;
    this.elapsed += 0.05;
    if (this.hits.length) this.hits = [];

    // Decay recent-damage tracker so screen shake intensity falls off when
    // the player stops blowing things up.
    if (this.recentDamage > 0) {
      this.recentDamage = Math.max(
        0,
        this.recentDamage - this.recentDamage * this.recentDamageDecayPerSec * dt
      );
    }
    // Practice DPS window decay.
    if (this.practiceMode && this.practiceDamage > 0) {
      const decayRate = 1 / this.practiceDpsWindow;
      this.practiceDamage = Math.max(0, this.practiceDamage - this.practiceDamage * decayRate * dt);
      this.practiceDps = this.practiceDamage / this.practiceDpsWindow;
    }

    if (this.domainActive) {
      this.domainTimer -= 0.05;
      if (this.domainTimer <= 0) {
        this.domainActive = false;
        if (!this.choosingUpgrade) this.timeScale = 1;
      }
    }
    if (this.ultActive) {
      this.ultTimer -= dt;
      if (this.ultTimer <= 0) this.ultActive = false;
    }
    // Slow background trickle to the ult meter so even passive play eventually
    // gets the button. Crits + kills give bigger bursts (see killEnemy / damage).
    if (this.ultEnergy < this.ultMax) {
      this.ultEnergy = Math.min(this.ultMax, this.ultEnergy + 1.5 * dt);
    }

    if (this.dashCdSec > 0) this.dashCdSec = Math.max(0, this.dashCdSec - dt);

    if (!this.downed && !this.spectating && !this.choosingUpgrade) {
      const c = CHARACTERS[this.characterId];
      let speed = c.speed * this.effects.speedMul * this.mutators.speedMul;
      const moveTech = this.techniques.find((t) => t.id === "movement_speed");
      if (moveTech) speed *= 1 + moveTech.level * 0.06;
      // Heavenly Restriction (Maki): physical body, also a brisker mover.
      const heavenly = this.techniques.find((t) => t.id === "heavenly_restriction");
      if (heavenly) speed *= 1 + heavenly.level * 0.05;

      if (this.dashDurSec > 0) {
        // Dash overrides regular movement with a fast burst in the dash dir.
        const dashSpeed = speed * 4.5;
        this.x += this.dashVx * dashSpeed * dt;
        this.y += this.dashVy * dashSpeed * dt;
        this.dashDurSec = Math.max(0, this.dashDurSec - dt);
      } else {
        const len = Math.hypot(this.moveX, this.moveY);
        if (len > 0.1) {
          this.x += (this.moveX / len) * speed * dt;
          this.y += (this.moveY / len) * speed * dt;
        }
      }
      // World is intentionally unbounded — the floor TileSprite follows
      // the camera and enemies spawn relative to the player, so there's
      // nothing to "fall off". Previously we clamped to ±1200 which the
      // player could walk into like a wall; that artificial edge is gone.
      this.autoAttack(dt);
    }

    // Streak decay: reset multiplier if no kills for streakDecaySec.
    if (this.streak > 0) {
      this.streakDecaySec -= dt * (1 / this.mutators.streakDecayMul);
      if (this.streakDecaySec <= 0) {
        this.streak = 0;
        this.lastStreakMul = 1;
      }
    }

    this.spawnEnemies(dt);
    this.moveEnemies(dt);
    this.tickProjectiles(dt);
    this.tickKitPassives(dt);
    if (this.invulnSec > 0) this.invulnSec = Math.max(0, this.invulnSec - dt);
    this.enemyDamage(dt);
    this.collectPickups();

    // Out-of-combat regen — kicks in after 4 seconds of no damage.
    this.outOfCombatSec += dt;
    if (!this.downed && this.outOfCombatSec > 4 && this.hp > 0 && this.hp < this.maxHp) {
      const regenPerSec = (1 + this.level * 0.4) * this.mutators.regenMul;
      this.hp = Math.min(this.maxHp, this.hp + regenPerSec * dt);
    }

    if (this.elapsed >= this.mutators.bossSpawnAtSec && !this.bossSpawned) this.spawnBoss();
    if (this.bossSpawned) this.tickBossSpecials(dt);

    // Push a compact frame to the replay ring buffer every ~50ms.
    this.replay.push({
      t: this.elapsed,
      player: { x: this.x, y: this.y, hp: this.hp },
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        hp: e.hp,
        boss: e.boss,
        elite: e.elite,
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        kind: p.kind,
        x: p.x,
        y: p.y,
        angle: p.angle,
      })),
    });

    if (this.bossSpawned && this.bossHp <= 0 && !this.bossDefeated) {
      this.bossDefeated = true;
      eventBus.emit({ kind: "boss_defeated" });
      if (!this.practiceMode) this.endRun("victory");
    }
    if (
      !this.practiceMode &&
      this.elapsed >= RUN_DURATION_SEC + 60 &&
      this.bossSpawned &&
      this.bossHp > 0
    )
      this.endRun("timeout");
    if (!this.practiceMode && this.hp <= 0 && this.spectating) this.endRun("defeat");

    this.emit();
  }

  /** Telegraph + AoE special the boss uses on a cadence after spawn */
  private tickBossSpecials(dt: number) {
    const boss = this.enemies.find((e) => e.boss);
    if (!boss) return;
    this.bossSpecialCooldown -= dt;
    if (this.bossSpecialCooldown <= 0) {
      const radius = this.bossPhase >= 2 ? 220 : 180;
      const tx = this.x + (this.rng() - 0.5) * 120;
      const ty = this.y + (this.rng() - 0.5) * 120;
      eventBus.emit({
        kind: "boss_telegraph",
        x: tx,
        y: ty,
        durationMs: this.bossPhase >= 2 ? 900 : 1300,
        label: this.bossPhase >= 2 ? "FLAME BURST!" : "ERUPTION",
      });
      const dmg = this.bossPhase >= 2 ? 28 : 22;
      setTimeout(() => {
        if (this.phase !== "run") return;
        if (this.invulnSec > 0 || this.downed || this.spectating) return;
        const d = Math.hypot(this.x - tx, this.y - ty);
        if (d < radius) {
          this.hp -= dmg;
          this.damageTakenTotal += dmg;
          this.outOfCombatSec = 0;
          this.invulnSec = 0.5;
          if (this.hp < 0) this.hp = 0;
        }
      }, this.bossPhase >= 2 ? 900 : 1300);
      this.bossSpecialCooldown = this.bossPhase >= 2 ? 5.5 : 8;
    }
  }

  /**
   * Base cooldowns (seconds) per technique. Higher = slower fire rate.
   * Passives are excluded entirely — they apply as modifiers, not direct damage.
   */
  private static readonly TECH_COOLDOWNS: Partial<Record<TechniqueId, number>> = {
    divergent_fist: 0.55, // fast brawler cadence
    divergent_black_chain: 0.5,
    blue_pull: 0.85, // vortex sphere
    precision_blue: 0.75,
    red_push: 1.1, // bursty knockback
    // divine_dogs now fires dashing wolves on cadence (was orbital).
    divine_dogs: 0.7,
    totality_dogs: 0.85,
    nue_bomb: 1.7,
    straw_doll: 0.5, // fast nail spam
    resonant_rupture: 0.55,
    // Secondary unlockables — sit between their character's primary and ult.
    sukuna_slash: 1.1,
    rabbit_escape: 1.4,
    hairpin: 1.5, // chain-detonates embedded nails — slower cadence
    hollow_purple: 3.2,
    // ── Character-specific actives ──────────────────────────────────
    manji_kick: 1.0,
    max_elephant: 1.9,
    nail_burst: 0.95,
    lapse_field: 1.4,
    // ── Evolutions (new) ───────────────────────────────────────────
    black_flash_hairpin: 2.4,
    shadow_frogs: 1.4,
    ten_shadows_totality: 2.6,
    limitless_catastrophe: 2.0,
    king_of_curses_momentum: 1.6,
    // Maki / Toge / Yuta starters + specifics.
    cursed_tools: 0.85, // boomerang spear — slower cadence, big payoff
    playful_cloud: 1.5, // chain kunai cone
    cursed_speech: 0.7, // expanding speech rings — fast cadence
    dont_move: 1.9, // sigil drop
    rika_swing: 0.55, // katana wave — fastest melee
    rika_throw: 1.7, // Rika manifestation — slower because she also hits hard
    // ── Maki / Toge / Yuta evolution actives ───────────────────────
    dragon_bone_cleaver: 1.4,
    forbidden_vocabulary: 2.4,
    true_love_arsenal: 1.8,
    // Ultimate paths (zenin_massacre / explode_word / love_beam) are
    // PASSIVE_TECHS — they unlock per-character branches inside
    // triggerUltimate() instead of auto-firing on cadence.
  };

  /** Passive techniques never tick damage directly; they modify other things. */
  private static readonly PASSIVE_TECHS = new Set<TechniqueId>([
    "black_flash",
    "resonance",
    "cursed_energy_regen",
    "movement_speed",
    "domain_expansion",
    "infinity",
    "team_synergy",
    // Generic projectile passives — modify spawnProjectile output.
    "multishot",
    "piercing_shot",
    "big_shots",
    "swift_shots",
    // Character-specific passives — modify damage / crit / xp.
    "bloodlust",
    "chimera_shadow",
    "cursed_brand",
    "six_eyes",
    "heavenly_restriction",
    "bon_appetit",
    "copy_technique",
    // ── Maki / Toge / Yuta passives ───────────────────────────────
    "close_combat",
    "dodge_deflect",
    "predator_rage",
    "reverse_throat",
    "status_spread",
    "echo_wave",
    "fully_manifested_rika",
    "summon_scaling",
    "crit_mini_rika",
    // Character ultimate "techniques" — not auto-fired; they unlock the
    // matching branch inside triggerUltimate().
    "zenin_massacre",
    "explode_word",
    "love_beam",
    // ── Yuji / Megumi / Nobara / Gojo passives + ultimates ────────
    "awakened_vessel",
    "floating_dolls",
    "nail_chains",
    "chimera_garden",
    "aoe_master",
    "black_flash_barrage",
    "shadow_domain",
    "resonance_collapse",
    "unlimited_void",
  ]);

  private autoAttack(dt: number) {
    // Black Flash adds crit chance, Cursed Energy Flow speeds attack cadence,
    // Resonance amplifies damage to elite/boss enemies. Synergies layer on
    // top of all three.
    const blackFlash = this.techniques.find((t) => t.id === "black_flash");
    let critChance = blackFlash ? Math.min(0.4, 0.08 * blackFlash.level) : 0;
    const energyFlow = this.techniques.find((t) => t.id === "cursed_energy_regen");
    let cadenceMul = energyFlow ? 1 / (1 + energyFlow.level * 0.08) : 1;
    const resonance = this.techniques.find((t) => t.id === "resonance");
    this.eliteDmgMul = resonance ? 1 + resonance.level * 0.12 : 1;

    let synergyDmgMul = 1;
    let synergyCdSub = 0;
    for (const s of this.synergies) {
      if (s.effect.techDmgMul) synergyDmgMul *= s.effect.techDmgMul;
      if (s.effect.cooldownSub) synergyCdSub += s.effect.cooldownSub;
      if (s.effect.critBonus) critChance += s.effect.critBonus;
    }
    // Mutator multipliers — Frenzy compresses cooldowns, Glass Cannon buffs dmg.
    cadenceMul *= this.mutators.cooldownMul;

    // ── Character-specific passive bonuses ──────────────────────────
    // Bloodlust (Yuji): big damage spike when at low HP.
    let charDmgMul = 1;
    const bloodlust = this.techniques.find((t) => t.id === "bloodlust");
    if (bloodlust && this.hp / Math.max(1, this.maxHp) < 0.5) {
      charDmgMul *= 1 + 0.25 * bloodlust.level;
    }
    // Heavenly Restriction (Maki, elite passive): straight physical damage
    // scalar plus a spear-cadence buff. The "invisible afterimage slashes"
    // and faster spear cadence are applied directly in the cursed_tools
    // branch of fireTechnique below.
    const heavenly = this.techniques.find((t) => t.id === "heavenly_restriction");
    if (heavenly) charDmgMul *= 1 + 0.12 * heavenly.level;
    // Predator Rage (Maki): after a kill we light a short timer that ramps
    // cadence + damage. Stacks up to `level` recent kills.
    if (this.predatorRageSec > 0) {
      const rage = this.techniques.find((t) => t.id === "predator_rage");
      if (rage) {
        cadenceMul *= 1 - Math.min(0.4, 0.08 * this.predatorRageStacks);
        charDmgMul *= 1 + 0.05 * this.predatorRageStacks;
      }
    }
    // Six Eyes (Gojo): boosts crit *damage* AND shaves cooldowns. This is
    // the elite upgrade slot for Gojo so it earns the dual scaling.
    const sixEyes = this.techniques.find((t) => t.id === "six_eyes");
    const critDmgMul = sixEyes ? 2.0 + 0.3 * sixEyes.level : 2.0;
    if (sixEyes) cadenceMul *= 1 / (1 + sixEyes.level * 0.04);
    // Yuji combo cadence — every active combo stack shaves a little off
    // cadenceMul (faster cycles) and buffs damage.
    if (this.comboCount > 0) {
      cadenceMul *= 1 - Math.min(0.35, 0.025 * this.comboCount);
      charDmgMul *= 1 + Math.min(0.3, 0.025 * this.comboCount);
    }
    if (this.blackFlashBuffSec > 0) cadenceMul *= 0.6;
    // Copy (Yuta): chance to fire a second time per tech.
    const copyTech = this.techniques.find((t) => t.id === "copy_technique");
    const copyChance = copyTech ? Math.min(0.5, 0.08 * copyTech.level) : 0;

    for (const tech of this.techniques) {
      if (SoloEngine.PASSIVE_TECHS.has(tech.id)) continue;
      const baseCd = SoloEngine.TECH_COOLDOWNS[tech.id];
      if (baseCd === undefined) continue;

      const cd = (this.techCooldowns[tech.id] ?? 0) - dt;
      if (cd > 0) {
        this.techCooldowns[tech.id] = cd;
        continue;
      }

      const baseDmg =
        (6 + tech.level * 3) *
        synergyDmgMul *
        this.mutators.techDmgMul *
        charDmgMul;
      const isCrit = this.rng() < critChance;
      const dmg = isCrit ? baseDmg * critDmgMul : baseDmg;

      this.fireTechnique(tech, dmg, isCrit);
      // Copy passive: re-fire with the same damage roll but no double-crit
      // proc (so it can't snowball ult charge).
      if (copyChance > 0 && this.rng() < copyChance) {
        this.fireTechnique(tech, dmg, false);
      }
      this.pendingCrit = false;
      this.techCooldowns[tech.id] = Math.max(0.1, baseCd * cadenceMul - synergyCdSub);
      // Crits charge the ult meter much more than regular hits.
      if (isCrit) this.ultEnergy = Math.min(this.ultMax, this.ultEnergy + 1.5);
    }

    // Step Divine Dogs: spawn / replace orbiters if their level changed.
    this.updateDivineDogs();
  }

  /** Add the unlockable techniques to the firing system. */
  private fireUnlockableTechnique(tech: SoloTechnique, dmg: number, isCrit: boolean): boolean {
    this.pendingCrit = isCrit;
    this.activeFireTech = tech.id;
    const id = tech.id;
    if (id === "sukuna_slash") {
      // Wide forward cleave — three big arcs in front of the player.
      const aim = this.aimAngle;
      for (const off of [-0.45, 0, 0.45]) {
        const a = aim + off;
        this.spawnProjectile({
          kind: "fist",
          x: this.x + Math.cos(a) * 36,
          y: this.y + Math.sin(a) * 36,
          vx: Math.cos(a) * 460,
          vy: Math.sin(a) * 460,
          life: 0.4,
          damage: dmg * 1.4,
          pierce: 4,
          angle: a,
        });
      }
      return true;
    }
    if (id === "rabbit_escape") {
      // Burst of 8 small "rabbit" projectiles in random forward arc.
      const aim = this.aimAngle;
      const count = 6 + tech.level * 2;
      for (let i = 0; i < count; i++) {
        const a = aim + (this.rng() - 0.5) * 1.6;
        this.spawnProjectile({
          kind: "dog",
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * 360,
          vy: Math.sin(a) * 360,
          life: 0.9,
          damage: dmg * 0.6,
          pierce: 2,
          angle: a,
        });
      }
      return true;
    }
    if (id === "hairpin") {
      // Hairpin — force-detonates every currently embedded nail at once
      // and rings the player with a fresh fan of embedding nails so the
      // chain stays primed.
      const chainsTech = this.techniques.find((t) => t.id === "nail_chains");
      const chainsRange = chainsTech ? 60 * chainsTech.level : 0;
      let detonated = 0;
      for (const p of this.projectiles) {
        if (!p.embed || !p.explodeOnDelay || p.delay == null) continue;
        // Force the explode-on-delay path to fire next frame by zeroing
        // its timer. Add chain reach via nail_chains passive.
        p.delay = 0;
        p.explodeRadius = (p.explodeRadius ?? 70) + chainsRange + 20 * tech.level;
        p.damage = Math.max(p.damage, dmg * 0.9);
        detonated++;
      }
      // Reseed nails so the combo keeps rolling.
      const count = 2 + tech.level;
      const spread = 0.4;
      const start = -((count - 1) / 2) * spread;
      for (let i = 0; i < count; i++) {
        const a = this.aimAngle + start + i * spread;
        this.spawnProjectile({
          kind: "embed_nail",
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * 540,
          vy: Math.sin(a) * 540,
          life: 1.0,
          damage: dmg * 0.9,
          pierce: 1,
          angle: a,
          embed: true,
          explodeRadius: 70 + chainsRange,
        });
      }
      // Hairpin scoring: a noisy detonation also slugs the marked enemy
      // directly (no resonance dependency required).
      if (detonated > 0 && this.markedEnemyId) {
        const mark = this.enemies.find((m) => m.id === this.markedEnemyId);
        if (mark) {
          mark.hp -= dmg * 0.6 * detonated;
          if (mark.hp <= 0) this.killEnemy(mark);
        }
      }
      return true;
    }
    return false;
  }

  /** Spawn visible projectiles or area effects for a fired technique. */
  private fireTechnique(
    tech: SoloTechnique,
    dmg: number,
    isCrit: boolean
  ) {
    this.pendingCrit = isCrit;
    this.activeFireTech = tech.id;
    const id = tech.id;

    if (id === "divergent_fist" || id === "divergent_black_chain") {
      const chain = id === "divergent_black_chain";
      // Forward fist projectile + delayed cursed-energy impact that lands
      // ~0.25s later at the same target spot. Count scales with level so
      // Yuji feels like he chains punches. Auto-aims at the nearest
      // enemy when the player isn't actively aiming.
      const target = this.findNearest(900);
      const aim = target
        ? Math.atan2(target.y - this.y, target.x - this.x)
        : this.aimAngle;
      const count = 1 + Math.min(2, Math.floor(tech.level / 2));
      const spread = count === 1 ? 0 : 0.32;
      const start = -((count - 1) / 2) * spread;
      // King of Curses Momentum (evolution): an extra cleave fires opposite
      // the aim direction as Yuji "dash-punches" through a target.
      const momentum = this.techniques.find((t) => t.id === "king_of_curses_momentum");
      for (let i = 0; i < count; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "fist",
          x: this.x + Math.cos(a) * 24,
          y: this.y + Math.sin(a) * 24,
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          life: 0.35,
          damage: dmg,
          pierce: 2,
          angle: a,
        });
        // Delayed cursed-energy impact at a projected landing point ~120 px
        // along the aim. The impact uses the embed-on-delay AoE pipeline so
        // it lands as a satisfying second hit.
        const dist = 110 + tech.level * 6;
        this.spawnProjectile({
          kind: "divergent_impact",
          x: this.x + Math.cos(a) * dist,
          y: this.y + Math.sin(a) * dist,
          vx: 0,
          vy: 0,
          life: 0.5,
          damage: dmg * 0.85,
          pierce: 0,
          angle: a,
          delay: chain ? 0.18 : 0.25,
          explodeOnDelay: true,
          explodeRadius: chain ? 90 + tech.level * 4 : 70,
        });
        if (chain && isCrit) {
          this.spawnProjectile({
            kind: "divergent_impact",
            x: this.x + Math.cos(a) * (dist + 40),
            y: this.y + Math.sin(a) * (dist + 40),
            vx: 0,
            vy: 0,
            life: 0.45,
            damage: dmg * 1.1,
            pierce: 0,
            angle: a,
            delay: 0.35,
            explodeOnDelay: true,
            explodeRadius: 85,
          });
        }
      }
      if (momentum) {
        const back = aim + Math.PI;
        this.spawnProjectile({
          kind: "fist",
          x: this.x + Math.cos(back) * 24,
          y: this.y + Math.sin(back) * 24,
          vx: Math.cos(back) * 520,
          vy: Math.sin(back) * 520,
          life: 0.35,
          damage: dmg * (1 + 0.1 * momentum.level),
          pierce: 3,
          angle: back,
        });
      }
      this.bumpCombo();
      return;
    }

    if (id === "straw_doll" || id === "resonant_rupture") {
      const rupture = id === "resonant_rupture";
      // Cursed Nail Shot — fast nails fly toward the nearest enemy in a
      // tight fan, pierce once on the way in, then embed at the impact
      // spot and detonate after a short delay (Hairpin can early-trigger
      // them all). Auto-aims at the nearest enemy so passive players still
      // land hits while the embed pipeline does the heavy AoE lifting.
      const target = this.findNearest(900);
      const aim = target
        ? Math.atan2(target.y - this.y, target.x - this.x)
        : this.aimAngle;
      const nails = rupture
        ? 2 + Math.floor(tech.level / 3)
        : 2 + Math.floor(tech.level / 2);
      const spread = 0.18;
      const start = -((nails - 1) / 2) * spread;
      const chainsTech = this.techniques.find((t) => t.id === "nail_chains");
      const chainsRange = chainsTech ? 60 * chainsTech.level : 0;
      const boom = (rupture ? 95 : 70) + chainsRange + (rupture ? tech.level * 6 : 0);
      for (let i = 0; i < nails; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "embed_nail",
          x: this.x + Math.cos(a) * 18,
          y: this.y + Math.sin(a) * 18,
          vx: Math.cos(a) * (rupture ? 700 : 640),
          vy: Math.sin(a) * (rupture ? 700 : 640),
          life: 0.9,
          damage: dmg * (rupture ? 1.05 : 0.85),
          pierce: 1, // hit once, then embed
          angle: a,
          embed: true,
          explodeRadius: boom,
          markTarget: true,
        });
      }
      return;
    }

    if (id === "nue_bomb") {
      // Shadow-lightning dive bomb on the densest cluster. The Nue strikes
      // from offscreen, then a chain-lightning style splash hits nearby
      // enemies on impact via the explode-on-delay AoE pipeline.
      const target = this.findCluster(220);
      const tx = target?.x ?? this.x + (this.rng() - 0.5) * 200;
      const ty = target?.y ?? this.y + (this.rng() - 0.5) * 200;
      this.spawnProjectile({
        kind: "nue",
        x: tx,
        y: ty - 360,
        vx: 0,
        vy: 720,
        life: 0.6,
        damage: dmg * 1.6,
        pierce: 99,
        angle: Math.PI / 2,
      });
      // Chain lightning splash at the landing point.
      this.spawnProjectile({
        kind: "nail_rupture",
        x: tx,
        y: ty,
        vx: 0,
        vy: 0,
        life: 0.5,
        damage: dmg * 0.6,
        pierce: 0,
        angle: 0,
        delay: 0.45,
        explodeOnDelay: true,
        explodeRadius: 130,
        summon: true,
      });
      return;
    }

    if (id === "blue_pull" || id === "precision_blue") {
      const precise = id === "precision_blue";
      // Blue — fires a compressed spatial sphere toward the nearest
      // enemy that pulls nearby enemies inward as it travels and
      // implodes for AoE on contact.
      const target = precise ? this.findCluster(260) ?? this.findNearest(900) : this.findNearest(900);
      const aim = target
        ? Math.atan2(target.y - this.y, target.x - this.x)
        : this.aimAngle;
      // Launch the sphere as a slow projectile that does a heavy implosion
      // on first hit via the embed/explode pipeline.
      this.spawnProjectile({
        kind: "blue",
        x: this.x + Math.cos(aim) * 36,
        y: this.y + Math.sin(aim) * 36,
        vx: Math.cos(aim) * (precise ? 420 : 360),
        vy: Math.sin(aim) * (precise ? 420 : 360),
        life: 1.1,
        damage: dmg * (precise ? 1.65 : 1.4),
        pierce: 1,
        angle: aim,
        embed: true,
        explodeRadius: (precise ? 130 : 110) + tech.level * (precise ? 10 : 8),
      });
      // Aura pull around the player so the sphere "drags" the swarm in.
      const pullRange = (precise ? 220 : 180) + tech.level * (precise ? 18 : 14);
      const pullStrength = (precise ? 6 : 4) + tech.level * (precise ? 0.85 : 0.6);
      for (const e of this.enemies) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < pullRange) {
          e.x -= (dx / dist) * pullStrength;
          e.y -= (dy / dist) * pullStrength;
        }
      }
      return;
    }

    if (id === "red_push") {
      // Red — explosive repulsion burst at the player's position. Massive
      // knockback + a ring shockwave that ripples outward.
      const range = 180 + tech.level * 22;
      for (const e of this.enemies) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d <= 0 || d > range) continue;
        const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
        e.hp -= dmg * 1.2 * mul;
        const push = 90 + tech.level * 14;
        e.x += (dx / d) * push * 0.1;
        e.y += (dy / d) * push * 0.1;
        if (e.hp <= 0) this.killEnemy(e);
      }
      // Visual shockwave ring — a fan of red curls so the renderer sells it.
      const wedges = 8 + Math.min(8, tech.level * 2);
      for (let i = 0; i < wedges; i++) {
        const a = (i / wedges) * Math.PI * 2;
        this.spawnProjectile({
          kind: "red",
          x: this.x + Math.cos(a) * 30,
          y: this.y + Math.sin(a) * 30,
          vx: Math.cos(a) * 540,
          vy: Math.sin(a) * 540,
          life: 0.4,
          damage: dmg * 0.4,
          pierce: 3,
          angle: a,
        });
      }
      return;
    }

    if (this.fireUnlockableTechnique(tech, dmg, isCrit)) return;

    // ── Yuji active branches ─────────────────────────────────────────
    // Manji Kick — spinning cone kick wave that knocks enemies back in a
    // tight forward arc. Uses the dedicated `kick_wave` kind for the
    // crisp crescent visual.
    if (id === "manji_kick") {
      const aim = this.aimAngle;
      const arcs = 3 + Math.min(3, tech.level);
      const spread = 0.45;
      const start = -((arcs - 1) / 2) * spread;
      for (let i = 0; i < arcs; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "kick_wave",
          x: this.x + Math.cos(a) * 30,
          y: this.y + Math.sin(a) * 30,
          vx: Math.cos(a) * 480,
          vy: Math.sin(a) * 480,
          life: 0.45,
          damage: dmg * 1.05,
          pierce: 4,
          angle: a,
        });
      }
      this.bumpCombo();
      return;
    }

    // ── Megumi active branches ───────────────────────────────────────
    // Max Elephant — shadow elephant blast crushes a forward arc.
    if (id === "max_elephant") {
      const a = this.aimAngle;
      for (let i = 0; i < 3; i++) {
        this.spawnProjectile({
          kind: "nue",
          x: this.x + Math.cos(a) * (60 + i * 80),
          y: this.y + Math.sin(a) * (60 + i * 80),
          vx: Math.cos(a) * 120,
          vy: Math.sin(a) * 120,
          life: 0.55,
          damage: dmg * (1.4 + tech.level * 0.15),
          pierce: 99,
          angle: a,
          summon: true,
        });
      }
      return;
    }

    // ── Nobara active branches ───────────────────────────────────────
    // Nail Burst — wide fan of embedding nails. Combined with Hairpin
    // this becomes an enormous chain detonation a few seconds later.
    if (id === "nail_burst") {
      const aim = this.aimAngle;
      const count = 5 + tech.level * 2;
      const spread = 0.18;
      const start = -((count - 1) / 2) * spread;
      const chainsTech = this.techniques.find((t) => t.id === "nail_chains");
      const chainsRange = chainsTech ? 60 * chainsTech.level : 0;
      for (let i = 0; i < count; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "embed_nail",
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * 720,
          vy: Math.sin(a) * 720,
          life: 0.85,
          damage: dmg * 0.55,
          pierce: 1,
          angle: a,
          embed: true,
          explodeRadius: 55 + chainsRange,
        });
      }
      return;
    }

    // ── Gojo active branches ─────────────────────────────────────────
    // Lapse Field — sustained cyan ring that slows and damages enemies
    // around the player.
    if (id === "lapse_field") {
      const radius = 110 + tech.level * 16;
      const segments = 10 + tech.level * 2;
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        this.spawnProjectile({
          kind: "blue",
          x: this.x + Math.cos(a) * radius,
          y: this.y + Math.sin(a) * radius,
          vx: 0,
          vy: 0,
          life: 0.7,
          damage: dmg * 0.5,
          pierce: 4,
          angle: a,
        });
      }
      return;
    }

    // ── Maki Zenin ───────────────────────────────────────────────────
    // Split Spear Toss (starter): the spear pierces forward, then a
    // boomerang return-stroke deals a heavier shockwave hit on the way
    // back to Maki. Heavenly Restriction (elite) cuts the cooldown and
    // spawns invisible afterimage slash waves perpendicular to the throw.
    if (id === "cursed_tools") {
      const aim = this.aimAngle;
      const heavenly = this.techniques.find((t) => t.id === "heavenly_restriction");
      const heavenlyMul = heavenly ? 1 + 0.1 * heavenly.level : 1;
      const count = 1 + Math.floor(tech.level / 3); // L1=1, L3=2, L6=3 spears
      const spread = count === 1 ? 0 : 0.18;
      const start = -((count - 1) / 2) * spread;
      for (let i = 0; i < count; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "spear",
          x: this.x + Math.cos(a) * 28,
          y: this.y + Math.sin(a) * 28,
          vx: Math.cos(a) * 560 * heavenlyMul,
          vy: Math.sin(a) * 560 * heavenlyMul,
          life: 0.95,
          damage: dmg * 1.1,
          pierce: 2 + Math.floor(tech.level / 2),
          angle: a,
          boomerang: true,
          returnDamageMul: 1.4,
        });
      }
      // Heavenly Restriction afterimage slash waves on either side of Maki
      // — invisible-but-deadly perpendicular slashes (read as ghost arcs).
      if (heavenly) {
        for (const side of [-1, 1]) {
          const a = aim + side * (Math.PI / 2);
          this.spawnProjectile({
            kind: "slash_wave",
            x: this.x + Math.cos(a) * 32,
            y: this.y + Math.sin(a) * 32,
            vx: Math.cos(a) * 320,
            vy: Math.sin(a) * 320,
            life: 0.35,
            damage: dmg * 0.6 * heavenly.level,
            pierce: 4,
            angle: a,
          });
        }
      }
      return;
    }

    // Chain Kunai (secondary): 3 chained kunai fire in a tight forward
    // cone. The chains tag enemies — that tag is consumed implicitly by
    // close_combat / heavenly_restriction multipliers on subsequent spear
    // hits, which read range from the player anyway.
    if (id === "playful_cloud") {
      const aim = this.aimAngle;
      const count = 3 + Math.floor(tech.level / 2);
      const spread = 0.22;
      const start = -((count - 1) / 2) * spread;
      for (let i = 0; i < count; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "kunai",
          x: this.x + Math.cos(a) * 20,
          y: this.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 620,
          vy: Math.sin(a) * 620,
          life: 0.75,
          damage: dmg * 0.65,
          pierce: 2,
          angle: a,
        });
      }
      return;
    }

    // Dragon-Bone Cleaver (evolution): giant cursed blade arcs — 3 wide
    // crescent slashes that fan out and pierce everything.
    if (id === "dragon_bone_cleaver") {
      const aim = this.aimAngle;
      const arcs = 3 + Math.min(2, Math.floor(tech.level / 2));
      const spread = 0.55;
      const start = -((arcs - 1) / 2) * spread;
      for (let i = 0; i < arcs; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "cleaver_arc",
          x: this.x + Math.cos(a) * 36,
          y: this.y + Math.sin(a) * 36,
          vx: Math.cos(a) * 420,
          vy: Math.sin(a) * 420,
          life: 0.7,
          damage: dmg * 1.8,
          pierce: 8,
          angle: a,
        });
      }
      return;
    }

    // ── Toge Inumaki ─────────────────────────────────────────────────
    // Cursed Speech Pulse (starter): expanding sound rings that pass
    // through everything in a wide forward arc. Echo Wave (passive) and
    // Reverse Throat (passive) hook in via fireTechnique / tickProjectiles.
    if (id === "cursed_speech") {
      const aim = this.aimAngle;
      const rings = 2 + Math.floor(tech.level / 2);
      const spread = 0.5;
      const start = -((rings - 1) / 2) * spread;
      for (let i = 0; i < rings; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "speech_ring",
          x: this.x + Math.cos(a) * 24,
          y: this.y + Math.sin(a) * 24,
          vx: Math.cos(a) * 520,
          vy: Math.sin(a) * 520,
          life: 0.6,
          damage: dmg * 0.85,
          pierce: 99,
          angle: a,
        });
      }
      this.scheduleEcho(tech, dmg, isCrit);
      return;
    }

    // Don't Move Sigil (secondary): drops floating kanji that detonate
    // after a delay. While the sigil is alive it roots enemies inside it.
    if (id === "dont_move") {
      const count = 2 + Math.floor(tech.level / 2);
      for (let i = 0; i < count; i++) {
        const target = this.findCluster(160) ?? this.findNearest(640);
        const tx = target?.x ?? this.x + (this.rng() - 0.5) * 240;
        const ty = target?.y ?? this.y + (this.rng() - 0.5) * 240;
        this.spawnProjectile({
          kind: "sigil",
          x: tx,
          y: ty,
          vx: 0,
          vy: 0,
          life: 0.9,
          damage: dmg * 1.4,
          pierce: 12,
          angle: 0,
          delay: 0.6,
        });
      }
      // Root enemies near the cast for the delay duration.
      const rootRange = 170 + tech.level * 14;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < rootRange) {
          e.x += (this.x - e.x) * 0.03;
          e.y += (this.y - e.y) * 0.03;
        }
      }
      this.scheduleEcho(tech, dmg, isCrit);
      return;
    }

    // Forbidden Vocabulary (evolution): battlefield-wide kanji commands
    // strike random enemy clusters.
    if (id === "forbidden_vocabulary") {
      const words = 4 + tech.level;
      for (let i = 0; i < words; i++) {
        const target =
          this.enemies[Math.floor(this.rng() * this.enemies.length)];
        const tx = target?.x ?? this.x + (this.rng() - 0.5) * 600;
        const ty = target?.y ?? this.y + (this.rng() - 0.5) * 600;
        this.spawnProjectile({
          kind: "forbidden_word",
          x: tx,
          y: ty,
          vx: 0,
          vy: 0,
          life: 0.6,
          damage: dmg * 1.6,
          pierce: 99,
          angle: 0,
          delay: 0.3,
        });
      }
      this.scheduleEcho(tech, dmg, isCrit);
      return;
    }

    // ── Yuta Okkotsu ─────────────────────────────────────────────────
    // Katana Wave (starter): thin compressed energy arcs in a tight fan
    // forward — medium range, fast attack speed.
    if (id === "rika_swing") {
      const aim = this.aimAngle;
      const count = 2 + Math.floor(tech.level / 2);
      const spread = 0.2;
      const start = -((count - 1) / 2) * spread;
      for (let i = 0; i < count; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "katana_arc",
          x: this.x + Math.cos(a) * 30,
          y: this.y + Math.sin(a) * 30,
          vx: Math.cos(a) * 720,
          vy: Math.sin(a) * 720,
          life: 0.5,
          damage: dmg * 0.95,
          pierce: 3,
          angle: a,
        });
      }
      return;
    }

    // Rika Manifestation (secondary): Rika appears and hurls giant cursed
    // fists. Fists prefer elite targets via the homing flag.
    if (id === "rika_throw") {
      const count = 1 + Math.floor(tech.level / 2);
      const aim = this.aimAngle;
      for (let i = 0; i < count; i++) {
        const a = aim + (i - (count - 1) / 2) * 0.3;
        this.spawnProjectile({
          kind: "rika_fist",
          x: this.x - Math.cos(aim) * 30, // spawn behind Yuta — "from Rika"
          y: this.y - Math.sin(aim) * 30,
          vx: Math.cos(a) * 460,
          vy: Math.sin(a) * 460,
          life: 1.4,
          damage: dmg * 1.8,
          pierce: 4,
          angle: a,
          homing: true,
          summon: true,
        });
      }
      return;
    }

    // True Love Arsenal (evolution): rotating cursed orbital — slash waves
    // + spirit beams together. Spawns short-lived sweepers around Yuta.
    if (id === "true_love_arsenal") {
      const sweeps = 6 + tech.level;
      for (let i = 0; i < sweeps; i++) {
        const a = (i / sweeps) * Math.PI * 2 + this.elapsed * 1.2;
        // Alternate katana arcs and beam segments for a "mixed arsenal" look.
        const kind: ProjectileKind = i % 2 === 0 ? "katana_arc" : "beam";
        this.spawnProjectile({
          kind,
          x: this.x + Math.cos(a) * 90,
          y: this.y + Math.sin(a) * 90,
          vx: Math.cos(a) * 380,
          vy: Math.sin(a) * 380,
          life: 0.55,
          damage: dmg * 0.9,
          pierce: 4,
          angle: a,
          summon: true,
        });
      }
      return;
    }

    if (id === "hollow_purple") {
      // Hollow Purple — Blue + Red fused into a slow-moving super-orb that
      // deletes everything in its path and leaves a beam-trail behind.
      const a = this.aimAngle;
      this.spawnProjectile({
        kind: "purple_orb",
        x: this.x + Math.cos(a) * 50,
        y: this.y + Math.sin(a) * 50,
        vx: Math.cos(a) * 540,
        vy: Math.sin(a) * 540,
        life: 1.6,
        damage: dmg * 2.4,
        pierce: 99,
        angle: a,
      });
      // Trailing purple beam segments so the orb leaves a clear cone behind.
      for (let i = 0; i < 5; i++) {
        this.spawnProjectile({
          kind: "beam",
          x: this.x + Math.cos(a) * (60 + i * 80),
          y: this.y + Math.sin(a) * (60 + i * 80),
          vx: Math.cos(a) * 760,
          vy: Math.sin(a) * 760,
          life: 0.45,
          damage: dmg * 0.9,
          pierce: 99,
          angle: a,
        });
      }
      return;
    }

    // ── Megumi — Divine Dog Assault (basic) ─────────────────────────
    // Shadow wolves dash forward, homing on the nearest enemy and biting
    // through them before dissolving. Chimera Shadow Garden adds an extra
    // wolf per cast + flat damage.
    if (id === "divine_dogs" || id === "totality_dogs") {
      const evo = id === "totality_dogs";
      const aim = this.aimAngle;
      const chimera = this.techniques.find((t) => t.id === "chimera_shadow");
      const wolves = evo
        ? 1 + Math.floor(tech.level / 4) + (chimera ? 1 : 0)
        : 1 + Math.floor(tech.level / 3) + (chimera ? 1 : 0);
      const chimeraDmg = chimera ? 1 + 0.25 * chimera.level : 1;
      const wolfDmg = dmg * (evo ? 1.55 : 1.2) * chimeraDmg;
      const spread = 0.25;
      const start = -((wolves - 1) / 2) * spread;
      for (let i = 0; i < wolves; i++) {
        const a = aim + start + i * spread;
        this.spawnProjectile({
          kind: "dash_wolf",
          x: this.x + Math.cos(a) * 24,
          y: this.y + Math.sin(a) * 24,
          vx: Math.cos(a) * (evo ? 600 : 540),
          vy: Math.sin(a) * (evo ? 600 : 540),
          life: 0.9,
          damage: wolfDmg,
          pierce: (evo ? 5 : 3) + Math.floor(tech.level / 2),
          angle: a,
          homing: true,
          summon: true,
        });
      }
      return;
    }

    // ── Megumi — Shadow Frogs (secondary) ───────────────────────────
    // Frogs leap into the densest cluster. Each frog applies a pull on
    // surrounding enemies via the slow-zone pipeline.
    if (id === "shadow_frogs") {
      const cluster = this.findCluster(220);
      const tx = cluster?.x ?? this.x + (this.rng() - 0.5) * 240;
      const ty = cluster?.y ?? this.y + (this.rng() - 0.5) * 240;
      const frogs = 2 + Math.floor(tech.level / 2);
      for (let i = 0; i < frogs; i++) {
        const ox = tx + (this.rng() - 0.5) * 80;
        const oy = ty + (this.rng() - 0.5) * 80;
        this.spawnProjectile({
          kind: "shadow_frog",
          x: ox,
          y: oy,
          vx: 0,
          vy: 0,
          life: 1.1,
          damage: dmg * 0.5,
          pierce: 0,
          angle: 0,
          slowZone: 80,
          summon: true,
        });
      }
      // Tongue-pull on nearby enemies — drag them toward the cluster center.
      for (const e of this.enemies) {
        const dx = tx - e.x;
        const dy = ty - e.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 220) {
          e.x += (dx / d) * 12;
          e.y += (dy / d) * 12;
        }
      }
      return;
    }

    // ── Megumi — Ten Shadows Totality (evolution) ───────────────────
    // Summon a giant fused shadow beast that crashes outward from the
    // player in the aim direction.
    if (id === "ten_shadows_totality") {
      const a = this.aimAngle;
      this.spawnProjectile({
        kind: "shadow_beast",
        x: this.x + Math.cos(a) * 40,
        y: this.y + Math.sin(a) * 40,
        vx: Math.cos(a) * 360,
        vy: Math.sin(a) * 360,
        life: 1.2,
        damage: dmg * 2.2,
        pierce: 99,
        angle: a,
        summon: true,
      });
      // Side beasts at level >=3
      if (tech.level >= 3) {
        for (const off of [-0.45, 0.45]) {
          const sa = a + off;
          this.spawnProjectile({
            kind: "shadow_beast",
            x: this.x + Math.cos(sa) * 40,
            y: this.y + Math.sin(sa) * 40,
            vx: Math.cos(sa) * 320,
            vy: Math.sin(sa) * 320,
            life: 1.0,
            damage: dmg * 1.5,
            pierce: 99,
            angle: sa,
            summon: true,
          });
        }
      }
      return;
    }

    // ── Nobara — Black Flash Hairpin (evolution) ────────────────────
    // Drops 3-5 massive ruptures around the player; each is a delayed
    // black-red explosion that splashes for big AoE damage.
    if (id === "black_flash_hairpin") {
      const ruptures = 3 + Math.floor(tech.level / 2);
      for (let i = 0; i < ruptures; i++) {
        const a = this.rng() * Math.PI * 2;
        const r = 80 + this.rng() * 220;
        this.spawnProjectile({
          kind: "nail_rupture",
          x: this.x + Math.cos(a) * r,
          y: this.y + Math.sin(a) * r,
          vx: 0,
          vy: 0,
          life: 0.6,
          damage: dmg * 1.6,
          pierce: 0,
          angle: 0,
          delay: 0.5,
          explodeOnDelay: true,
          explodeRadius: 130 + tech.level * 10,
        });
      }
      return;
    }

    // ── Gojo — Limitless Catastrophe (evolution) ────────────────────
    // Spawns random Blue/Red collisions across the battlefield + an
    // occasional purple beam sweep.
    if (id === "limitless_catastrophe") {
      const collisions = 5 + tech.level;
      for (let i = 0; i < collisions; i++) {
        const a = this.rng() * Math.PI * 2;
        const r = 120 + this.rng() * 320;
        const x = this.x + Math.cos(a) * r;
        const y = this.y + Math.sin(a) * r;
        // Blue implosion at the spot
        this.spawnProjectile({
          kind: "blue",
          x,
          y,
          vx: 0,
          vy: 0,
          life: 0.5,
          damage: dmg * 0.7,
          pierce: 4,
          angle: 0,
        });
        // Followed by a Red detonation
        this.spawnProjectile({
          kind: "red",
          x,
          y,
          vx: (this.rng() - 0.5) * 400,
          vy: (this.rng() - 0.5) * 400,
          life: 0.5,
          damage: dmg * 0.9,
          pierce: 4,
          angle: this.rng() * Math.PI * 2,
        });
      }
      // Purple sweep beam in the aim direction every cast.
      const aim = this.aimAngle;
      for (let i = 0; i < 4; i++) {
        this.spawnProjectile({
          kind: "beam",
          x: this.x + Math.cos(aim) * (60 + i * 90),
          y: this.y + Math.sin(aim) * (60 + i * 90),
          vx: Math.cos(aim) * 900,
          vy: Math.sin(aim) * 900,
          life: 0.45,
          damage: dmg * 0.8,
          pierce: 99,
          angle: aim,
        });
      }
      return;
    }

    // ── Yuji — King of Curses Momentum (evolution active) ───────────
    // Yuji dash-punches forward and leaves orbiting cleaves rotating
    // around him for a few seconds.
    if (id === "king_of_curses_momentum") {
      const aim = this.aimAngle;
      // Dash punch — big single fist + delayed impact.
      const dist = 200;
      this.spawnProjectile({
        kind: "fist",
        x: this.x + Math.cos(aim) * 40,
        y: this.y + Math.sin(aim) * 40,
        vx: Math.cos(aim) * 760,
        vy: Math.sin(aim) * 760,
        life: 0.45,
        damage: dmg * 1.6,
        pierce: 5,
        angle: aim,
      });
      this.spawnProjectile({
        kind: "divergent_impact",
        x: this.x + Math.cos(aim) * dist,
        y: this.y + Math.sin(aim) * dist,
        vx: 0,
        vy: 0,
        life: 0.6,
        damage: dmg * 1.2,
        pierce: 0,
        angle: aim,
        delay: 0.2,
        explodeOnDelay: true,
        explodeRadius: 110,
      });
      // Orbiting cleaves — short-lived rotating slash_wave projectiles.
      const cleaves = 4 + tech.level;
      for (let i = 0; i < cleaves; i++) {
        const a = (i / cleaves) * Math.PI * 2;
        this.spawnProjectile({
          kind: "black_flash_crack",
          x: this.x + Math.cos(a) * 80,
          y: this.y + Math.sin(a) * 80,
          vx: Math.cos(a) * 240,
          vy: Math.sin(a) * 240,
          life: 0.55,
          damage: dmg * 0.9,
          pierce: 3,
          angle: a,
        });
      }
      this.bumpCombo();
      return;
    }
  }

  /**
   * Legacy: kept as a no-op so other call sites that still invoke it (e.g.
   * Mahoraga ult buff) don't crash. Divine Dogs is now a dashing-wolf
   * fireTechnique — no orbiters to keep alive.
   */
  private updateDivineDogs() {
    // Intentionally empty — divine_dogs spawns per-cast dashing wolves now,
    // and Chimera Garden / Chimera Shadow add their own per-cast bonuses
    // inside fireTechnique. Kept as a hook so the Megumi ultimate branch
    // and historical `autoAttack()` call site remain valid.
  }

  private spawnProjectile(opts: {
    kind: ProjectileKind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    damage: number;
    pierce: number;
    angle: number;
    orbit?: { angle: number; radius: number; speed: number };
    homing?: boolean;
    boomerang?: boolean;
    returnDamageMul?: number;
    delay?: number;
    summon?: boolean;
    embed?: boolean;
    explodeOnDelay?: boolean;
    explodeRadius?: number;
    slowZone?: number;
    markTarget?: boolean;
    /**
     * Set on recursive sister spawns from `multishot` so we don't cascade
     * (one shot would otherwise become 4 → 16 → 64 ...).
     */
    noMods?: boolean;
  }) {
    if (this.projectiles.length > 120) {
      // Drop the oldest non-orbital projectile to keep the pool bounded.
      const idx = this.projectiles.findIndex((p) => !p.orbit);
      if (idx >= 0) this.projectiles.splice(idx, 1);
    }

    // ── Generic projectile passives ─────────────────────────────────
    // Orbital projectiles (Divine Dogs) and explicitly-marked sister shots
    // skip mods to keep mechanics predictable.
    if (!opts.noMods && !opts.orbit) {
      const piercing = this.techniques.find((t) => t.id === "piercing_shot");
      if (piercing) opts.pierce += piercing.level;
      const swift = this.techniques.find((t) => t.id === "swift_shots");
      if (swift) {
        const mul = 1 + 0.22 * swift.level;
        opts.vx *= mul;
        opts.vy *= mul;
      }
    }

    const projId = nextId();
    // Big Shots: stored on the projectile so collision can read it.
    const big = !opts.orbit ? this.techniques.find((t) => t.id === "big_shots") : undefined;
    const radiusMul = big ? 1 + 0.18 * big.level : undefined;

    // Summon scaling (Yuta — Spirit Bond): Rika summons gain damage based
    // on how many enemies have been exorcised this run.
    let dmg = opts.damage;
    if (opts.summon) {
      const bond = this.techniques.find((t) => t.id === "summon_scaling");
      if (bond) {
        const stacks = Math.min(30, this.exorcismCount) * 0.02 * bond.level;
        dmg *= 1 + Math.min(0.6 * bond.level, stacks);
      }
    }
    this.projectiles.push({
      id: projId,
      kind: opts.kind,
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      life: opts.life,
      lifeMax: opts.life,
      damage: dmg,
      pierce: opts.pierce,
      hitIds: new Set(),
      angle: opts.angle,
      orbit: opts.orbit,
      homing: opts.homing,
      crit: this.pendingCrit || undefined,
      radiusMul,
      boomerang: opts.boomerang,
      returnDamageMul: opts.returnDamageMul,
      delay: opts.delay,
      anchorX: (opts.delay || opts.slowZone) ? opts.x : undefined,
      anchorY: (opts.delay || opts.slowZone) ? opts.y : undefined,
      summon: opts.summon,
      embed: opts.embed,
      explodeOnDelay: opts.explodeOnDelay,
      explodeRadius: opts.explodeRadius,
      slowZone: opts.slowZone,
      markTarget: opts.markTarget,
    });
    if (this.activeFireTech) this.projectileSource.set(projId, this.activeFireTech);

    // Multishot: spawn N-1 sister projectiles at small angle offsets. They
    // inherit the already-modified velocity/pierce, but skip further mods
    // (noMods flag) so we never cascade. Fully Manifested Rika (Yuta) adds
    // a free extra copy that fires on the opposite side at full damage —
    // canonically Rika "mimics" Yuta's attacks.
    if (!opts.noMods && !opts.orbit) {
      const multi = this.techniques.find((t) => t.id === "multishot");
      const rika = this.techniques.find((t) => t.id === "fully_manifested_rika");
      const multiLevels = (multi?.level ?? 0) + (rika ? rika.level : 0);
      if (multiLevels > 0) {
        const speed = Math.hypot(opts.vx, opts.vy);
        const baseAngle = Math.atan2(opts.vy, opts.vx);
        for (let i = 0; i < multiLevels; i++) {
          const off = (i % 2 === 0 ? 1 : -1) * (0.12 + 0.05 * Math.floor(i / 2));
          const a = baseAngle + off;
          // Rika-sourced sister shots keep 90% damage (vs multishot's 70%)
          // so the elite passive really earns its slot.
          const fromRika = i >= (multi?.level ?? 0);
          this.spawnProjectile({
            ...opts,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            damage: opts.damage * (fromRika ? 0.9 : 0.7),
            angle: a,
            noMods: true,
            summon: fromRika ? true : opts.summon,
          });
        }
      }
    }
  }

  /** Per-projectile-id timer to periodically forget hit enemies (for orbiters). */
  private projectileHitClear = new Map<string, number>();

  /** Update projectile movement + collisions with enemies. */
  private tickProjectiles(dt: number) {
    if (!this.projectiles.length) return;
    const next: SoloProjectile[] = [];
    const beforeIds = new Set(this.projectiles.map((p) => p.id));
    for (const p of this.projectiles) {
      if (p.orbit) {
        // Orbiting projectiles re-tick their damage by clearing hitIds every 0.45s
        // so they can re-damage enemies they've already touched.
        const clearAt = (this.projectileHitClear.get(p.id) ?? 0) - dt;
        if (clearAt <= 0) {
          p.hitIds.clear();
          this.projectileHitClear.set(p.id, 0.45);
        } else {
          this.projectileHitClear.set(p.id, clearAt);
        }
        p.orbit.angle += p.orbit.speed * dt;
        p.x = this.x + Math.cos(p.orbit.angle) * p.orbit.radius;
        p.y = this.y + Math.sin(p.orbit.angle) * p.orbit.radius;
        p.angle = p.orbit.angle + Math.PI / 2;
      } else {
        // Megumi Chimera Garden — shadow pool: sit on anchor, slow and
        // chip every enemy inside the slowZone radius each frame. Don't
        // run normal projectile collision; render-only sprite.
        if (p.slowZone && p.anchorX != null && p.anchorY != null) {
          p.x = p.anchorX;
          p.y = p.anchorY;
          const r2 = p.slowZone * p.slowZone;
          for (const e of this.enemies) {
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            if (dx * dx + dy * dy > r2) continue;
            // Slow: pull velocity toward zero (acts like a drag field).
            e.x -= dx * 0.005;
            e.y -= dy * 0.005;
            const tick = p.damage * dt;
            const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
            e.hp -= tick * mul;
            if (e.hp <= 0) this.killEnemy(e);
          }
          p.life -= dt;
          if (p.life <= 0) continue;
          next.push(p);
          continue;
        }
        // Delayed projectiles (Toge sigils, Echo Wave, Explode., Nobara
        // embedded nails) sit on their anchor until the timer expires.
        if (p.delay && p.delay > 0) {
          p.delay -= dt;
          if (p.anchorX != null && p.anchorY != null) {
            p.x = p.anchorX;
            p.y = p.anchorY;
          }
          p.life -= dt * 0.4; // bleed life slowly so the trail can fade
          if (p.delay > 0) {
            next.push(p);
            continue;
          }
          // Delay just hit 0 — if this projectile is set to detonate on
          // expiry, do a one-shot AoE here then despawn cleanly.
          if (p.explodeOnDelay) {
            const radius = p.explodeRadius ?? 80;
            const src = this.projectileSource.get(p.id);
            this.damageRadiusFx(p.x, p.y, radius, p.damage, !!p.crit, src);
            continue;
          }
        }
        if (p.homing) {
          const target = this.findNearest(900, p.hitIds);
          if (target) {
            const ang = Math.atan2(target.y - p.y, target.x - p.x);
            const speed = Math.hypot(p.vx, p.vy);
            p.vx += (Math.cos(ang) * speed - p.vx) * Math.min(1, dt * 4);
            p.vy += (Math.sin(ang) * speed - p.vy) * Math.min(1, dt * 4);
          }
        }
        // Boomerang reversal once half the lifetime has elapsed. We also
        // re-arm hitIds + bump the damage by `returnDamageMul` so the
        // return path lands the spec's "shockwave" hit.
        if (p.boomerang && !p.returned && p.life <= p.lifeMax * 0.5) {
          p.returned = true;
          p.hitIds.clear();
          if (p.returnDamageMul) p.damage *= p.returnDamageMul;
          const speed = Math.hypot(p.vx, p.vy);
          const dx = this.x - p.x;
          const dy = this.y - p.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          p.vx = (dx / dist) * speed;
          p.vy = (dy / dist) * speed;
        }
        // On the return path, gently steer toward the player so the spear
        // always finds its way home (similar to homing but cheaper).
        if (p.boomerang && p.returned) {
          const dx = this.x - p.x;
          const dy = this.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 12) {
            const speed = Math.hypot(p.vx, p.vy);
            const ang = Math.atan2(dy, dx);
            p.vx += (Math.cos(ang) * speed - p.vx) * Math.min(1, dt * 5);
            p.vy += (Math.sin(ang) * speed - p.vy) * Math.min(1, dt * 5);
          } else {
            // Caught — despawn cleanly.
            continue;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle = Math.atan2(p.vy, p.vx);
        p.life -= dt;
        if (p.life <= 0) continue;
      }

      // Collide with enemies — Big Shots passive widens the collision circle.
      const baseRadius = projectileRadius(p.kind);
      const radius = p.radiusMul ? baseRadius * p.radiusMul : baseRadius;
      let pierceLeft = p.pierce - p.hitIds.size;
      // Cursed Brand (Nobara): +bonus damage per level on every hit. Read once
      // per projectile rather than per-enemy for cheapness.
      const brand = this.techniques.find((t) => t.id === "cursed_brand");
      const brandMul = brand ? 1 + 0.2 * brand.level : 1;
      // Close Combat (Maki): bonus damage vs enemies within 160 px of the player.
      const closeCombat = this.techniques.find((t) => t.id === "close_combat");
      const closeCombatMul = closeCombat ? 1 + 0.1 * closeCombat.level : 1;
      // Cursed Contagion (Toge): on every projectile hit, splash secondary
      // curse damage to enemies in a small radius.
      const contagion = this.techniques.find((t) => t.id === "status_spread");
      // Reverse Throat (Toge): killing a target with a speech tech triggers
      // a chain explosion that damages enemies around the corpse.
      const reverseThroat = this.techniques.find((t) => t.id === "reverse_throat");
      const techSrc = this.projectileSource.get(p.id);
      const isSpeechTech =
        techSrc === "cursed_speech" ||
        techSrc === "dont_move" ||
        techSrc === "forbidden_vocabulary" ||
        techSrc === "explode_word";
      // Mini Rika (Yuta): crit hits have a chance to spawn a mini Rika that
      // bites a nearby enemy.
      const miniRika = this.techniques.find((t) => t.id === "crit_mini_rika");
      // Nobara Resonance: every elite/boss is auto-marked and damage to
      // weak linked targets splashes a fraction onto the marked enemy.
      const resonanceTech = this.techniques.find((t) => t.id === "resonance");
      // Awakened Vessel (Yuji): each Divergent Fist hit emits a shockwave
      // that chips nearby enemies.
      const awakened = this.techniques.find((t) => t.id === "awakened_vessel");
      const isFistTech =
        techSrc === "divergent_fist" ||
        techSrc === "manji_kick" ||
        techSrc === "king_of_curses_momentum";
      // Gojo Spatial Mastery — bonus damage vs enemies clustered together.
      const aoeMaster = this.techniques.find((t) => t.id === "aoe_master");
      // Black Flash crit crack — Yuji's signature spatial-black critical
      // strike: every crit from a fist tech spawns a crack burst and
      // refreshes the attack-speed buff window.
      const blackFlash = this.techniques.find((t) => t.id === "black_flash");
      for (const e of this.enemies) {
        if (pierceLeft <= 0) break;
        if (p.hitIds.has(e.id)) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy > radius * radius) continue;
        p.hitIds.add(e.id);
        const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
        // Maki: range check vs player for Close Combat bonus.
        let proximityMul = 1;
        if (closeCombat) {
          const pdx = e.x - this.x;
          const pdy = e.y - this.y;
          if (pdx * pdx + pdy * pdy <= 160 * 160) proximityMul = closeCombatMul;
        }
        // Gojo Spatial Mastery — count neighbours within 140 px of THIS
        // enemy. If >=3 neighbours, bump damage per level.
        let clusterMul = 1;
        if (aoeMaster) {
          let neighbours = 0;
          for (const o of this.enemies) {
            if (o.id === e.id) continue;
            const ox = o.x - e.x;
            const oy = o.y - e.y;
            if (ox * ox + oy * oy <= 140 * 140) {
              neighbours++;
              if (neighbours >= 3) break;
            }
          }
          if (neighbours >= 3) clusterMul = 1 + 0.12 * aoeMaster.level;
        }
        const dealt = p.damage * mul * brandMul * proximityMul * clusterMul;
        e.hp -= dealt;
        const src = this.projectileSource.get(p.id);
        if (src) this.techDamage[src] = (this.techDamage[src] ?? 0) + dealt;
        // Feed damage into the rolling tracker for shake hierarchy (Tier 2 #6)
        // and the practice-mode DPS readout (Tier 4 #17).
        this.recentDamage += dealt;
        if (this.practiceMode) this.practiceDamage += dealt;
        this.hits.push({
          x: e.x,
          y: e.y,
          elite: !!(e.boss || e.elite),
          crit: !!p.crit,
        });
        // Toge Cursed Contagion — splash damage out from the impact point.
        if (contagion && e.hp > 0) {
          const splashRange = 70 + contagion.level * 10;
          const splashDmg = dealt * (0.18 + 0.04 * contagion.level);
          for (const o of this.enemies) {
            if (o.id === e.id) continue;
            const ox = o.x - e.x;
            const oy = o.y - e.y;
            if (ox * ox + oy * oy > splashRange * splashRange) continue;
            const om = o.boss || o.elite ? this.eliteDmgMul : 1;
            o.hp -= splashDmg * om;
            if (o.hp <= 0) this.killEnemy(o);
          }
        }
        // Yuta Mini Rika — crit hits spawn a small homing mini-Rika.
        if (miniRika && p.crit && this.rng() < Math.min(0.5, 0.12 * miniRika.level)) {
          this.spawnProjectile({
            kind: "mini_rika",
            x: e.x,
            y: e.y,
            vx: 0,
            vy: 0,
            life: 1.6,
            damage: p.damage * 0.6,
            pierce: 2,
            angle: 0,
            homing: true,
            summon: true,
          });
        }
        // Nobara — auto-mark elites/bosses and link splash damage to the
        // current mark. Weak-enemy hits trickle a fraction of damage onto
        // whichever elite/boss is currently marked.
        if (resonanceTech) {
          if ((e.elite || e.boss) && (p.markTarget || true)) {
            this.markedEnemyId = e.id;
            this.markedEnemyLinkSec = 6;
          } else if (this.markedEnemyId && this.markedEnemyId !== e.id) {
            const mark = this.enemies.find((m) => m.id === this.markedEnemyId);
            if (mark) {
              const link = dealt * (0.18 + 0.05 * resonanceTech.level);
              mark.hp -= link;
              if (mark.hp <= 0) this.killEnemy(mark);
            }
          }
        }
        // Yuji Awakened Vessel — punch shockwave on every fist-line hit.
        if (awakened && isFistTech) {
          const range = 90 + awakened.level * 20;
          const shockDmg = dealt * 0.25;
          for (const o of this.enemies) {
            if (o.id === e.id) continue;
            const ox = o.x - e.x;
            const oy = o.y - e.y;
            if (ox * ox + oy * oy > range * range) continue;
            const om = o.boss || o.elite ? this.eliteDmgMul : 1;
            o.hp -= shockDmg * om;
            if (o.hp <= 0) this.killEnemy(o);
          }
          this.hits.push({ x: e.x, y: e.y, elite: false, crit: !!p.crit });
        }
        // Yuji Black Flash — crit + fist tech spawns a spatial crack and
        // refreshes the attack-speed buff window.
        if (blackFlash && p.crit && isFistTech) {
          this.blackFlashBuffSec = 1.4;
          this.pendingCrit = true;
          this.spawnProjectile({
            kind: "black_flash_crack",
            x: e.x,
            y: e.y,
            vx: 0,
            vy: 0,
            life: 0.4,
            damage: dealt * 0.5,
            pierce: 0,
            angle: 0,
            delay: 0.05,
            explodeOnDelay: true,
            explodeRadius: 80,
          });
          this.pendingCrit = false;
        }
        if (e.hp <= 0) {
          this.killEnemy(e);
          // Toge Reverse Throat — chain reaction explosion on kill from a
          // speech technique. Damages all enemies in a medium radius.
          if (reverseThroat && isSpeechTech) {
            const chainRange = 80 + reverseThroat.level * 20;
            const chainDmg = (10 + reverseThroat.level * 8) * (this.eliteDmgMul || 1);
            for (const o of this.enemies) {
              const ox = o.x - e.x;
              const oy = o.y - e.y;
              if (ox * ox + oy * oy > chainRange * chainRange) continue;
              const om = o.boss || o.elite ? this.eliteDmgMul : 1;
              o.hp -= chainDmg * om;
              if (o.hp <= 0) this.killEnemy(o);
            }
            this.hits.push({ x: e.x, y: e.y, elite: true, crit: true });
          }
        }
        pierceLeft--;
      }

      // Nobara — embedded nails: on first collision, stop the projectile,
      // anchor it at the impact point, and flip on the delay-detonation
      // so it pops as an AoE later (or when Hairpin force-detonates).
      if (p.embed && p.hitIds.size > 0 && p.delay == null) {
        p.vx = 0;
        p.vy = 0;
        p.delay = 4.0; // auto-pop after ~4s
        p.explodeOnDelay = true;
        if (p.explodeRadius == null) p.explodeRadius = 70;
        p.anchorX = p.x;
        p.anchorY = p.y;
        // Track for Hairpin force-detonation. We keep the projectile alive
        // so the tickProjectiles delay path will run next frame.
        next.push(p);
        continue;
      }
      // Cull projectiles that have exhausted pierce (except orbits and
      // boomerangs that haven't yet reversed — they re-arm hitIds on the
      // return stroke and would otherwise die one frame before flipping).
      if (!p.orbit && p.hitIds.size >= p.pierce) {
        if (!(p.boomerang && !p.returned)) continue;
      }
      // Cull if too far from player
      if (!p.orbit) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        if (dx * dx + dy * dy > 1800 * 1800) continue;
      }
      next.push(p);
    }
    this.projectiles = next;
    // Drop tech-source mappings for culled projectiles so the map doesn't grow.
    if (this.projectileSource.size > 0) {
      const kept = new Set(next.map((p) => p.id));
      for (const id of beforeIds) if (!kept.has(id)) this.projectileSource.delete(id);
    }
  }

  private findNearest(maxDist: number, exclude?: Set<string>): SoloEnemy | null {
    let best: SoloEnemy | null = null;
    let bestD = maxDist * maxDist;
    for (const e of this.enemies) {
      if (exclude?.has(e.id)) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = e;
      }
    }
    return best;
  }

  /** Find the centroid of the densest cluster within `radius` of any enemy. */
  private findCluster(radius: number): SoloEnemy | null {
    let best: SoloEnemy | null = null;
    let bestCount = 0;
    for (const e of this.enemies) {
      let count = 0;
      for (const o of this.enemies) {
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        if (dx * dx + dy * dy < radius * radius) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        best = e;
      }
    }
    return best;
  }

  private damageRadius(
    x: number,
    y: number,
    range: number,
    dmg: number,
    pull: boolean
  ) {
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > range) continue;
      const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
      e.hp -= dmg * mul;
      if (pull && d > 1) {
        e.x -= ((e.x - x) / d) * 3;
        e.y -= ((e.y - y) / d) * 3;
      }
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  /**
   * Same as `damageRadius` but also emits a hit FX entry per affected
   * enemy so the renderer can flash impact sprites. Used by Nobara's
   * embedded-nail and Hairpin chain detonations, plus shared explosion
   * helpers (Reverse Throat, Awakened Vessel, etc. all funnel through here
   * via wrappers). Optionally credits damage to a source technique so the
   * run-end stats panel attributes embed-pop / ultimate damage correctly.
   */
  private damageRadiusFx(
    x: number,
    y: number,
    range: number,
    dmg: number,
    crit: boolean,
    src?: TechniqueId
  ) {
    const r2 = range * range;
    for (const e of this.enemies) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy > r2) continue;
      const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
      const dealt = dmg * mul;
      e.hp -= dealt;
      this.hits.push({ x: e.x, y: e.y, elite: !!(e.boss || e.elite), crit });
      this.recentDamage += dealt;
      if (this.practiceMode) this.practiceDamage += dealt;
      if (src) this.techDamage[src] = (this.techDamage[src] ?? 0) + dealt;
      if (e.hp <= 0) this.killEnemy(e);
    }
  }

  private damageNearest(range: number, dmg: number) {
    let best: SoloEnemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) {
      const mul = best.boss || best.elite ? this.eliteDmgMul : 1;
      best.hp -= dmg * mul;
      if (best.hp <= 0) this.killEnemy(best);
    }
  }

  /**
   * Per-tick maintenance for the new Maki/Toge/Yuta kit passives and
   * ultimate channels. Pulled out of `tick()` so the main loop stays terse.
   */
  private tickKitPassives(dt: number) {
    // Maki Predator Rage decay.
    if (this.predatorRageSec > 0) {
      this.predatorRageSec = Math.max(0, this.predatorRageSec - dt);
      if (this.predatorRageSec === 0) this.predatorRageStacks = 0;
    }

    // Yuji combo decay — drops to 0 after a couple seconds without a hit.
    if (this.comboCount > 0) {
      this.comboDecaySec -= dt;
      if (this.comboDecaySec <= 0) this.comboCount = 0;
    }
    if (this.blackFlashBuffSec > 0) {
      this.blackFlashBuffSec = Math.max(0, this.blackFlashBuffSec - dt);
    }

    // Nobara — marked enemy link decay.
    if (this.markedEnemyLinkSec > 0) {
      this.markedEnemyLinkSec = Math.max(0, this.markedEnemyLinkSec - dt);
      if (this.markedEnemyLinkSec === 0) this.markedEnemyId = null;
    }
    // Clear the mark if the marked enemy has been killed.
    if (this.markedEnemyId && !this.enemies.find((e) => e.id === this.markedEnemyId)) {
      this.markedEnemyId = null;
      this.markedEnemyLinkSec = 0;
    }

    // Nobara — Floating Straw Dolls: every 1.6s a doll fires a nail at the
    // nearest enemy. Number of dolls scales with passive level.
    const dolls = this.techniques.find((t) => t.id === "floating_dolls");
    if (dolls && this.enemies.length > 0) {
      this.floatingDollFireSec -= dt;
      if (this.floatingDollFireSec <= 0) {
        this.floatingDollFireSec = 1.6;
        const dollCount = 1 + dolls.level;
        const baseDmg = 6 + dolls.level * 4;
        const chainsTech = this.techniques.find((t) => t.id === "nail_chains");
        const chainsRange = chainsTech ? 60 * chainsTech.level : 0;
        for (let i = 0; i < dollCount; i++) {
          const target = this.findNearest(900);
          if (!target) break;
          const a = Math.atan2(target.y - this.y, target.x - this.x) +
            (this.rng() - 0.5) * 0.25;
          this.spawnProjectile({
            kind: "embed_nail",
            x: this.x + Math.cos(a) * 60,
            y: this.y + Math.sin(a) * 60,
            vx: Math.cos(a) * 620,
            vy: Math.sin(a) * 620,
            life: 0.9,
            damage: baseDmg,
            pierce: 1,
            angle: a,
            embed: true,
            explodeRadius: 50 + chainsRange,
            summon: true,
          });
        }
      }
    } else {
      this.floatingDollFireSec = 0;
    }

    // Yuji Black Flash Barrage — every ~0.12s during the barrage window
    // we slam a random enemy with a punch + spatial crack burst.
    if (this.barrageTimer > 0) {
      this.barrageTimer = Math.max(0, this.barrageTimer - dt);
      this.barrageHits += dt;
      if (this.barrageHits >= 0.12) {
        this.barrageHits = 0;
        const target = this.findNearest(700) ??
          this.enemies[Math.floor(this.rng() * this.enemies.length)];
        if (target) {
          const a = Math.atan2(target.y - this.y, target.x - this.x);
          this.pendingCrit = true;
          this.spawnProjectile({
            kind: "black_flash_crack",
            x: target.x,
            y: target.y,
            vx: 0,
            vy: 0,
            life: 0.35,
            damage: this.barrageDmg,
            pierce: 0,
            angle: a,
            delay: 0.0001,
            explodeOnDelay: true,
            explodeRadius: 80,
          });
          this.pendingCrit = false;
        }
      }
      // Final cinematic explosion when the timer expires.
      if (this.barrageTimer === 0 && this.barrageDmg > 0) {
        this.damageRadiusFx(this.x, this.y, 360, this.barrageDmg * 3, true);
        this.barrageDmg = 0;
      }
    }

    // Gojo Unlimited Void — countdown freeze. While voidTimer > 0 we
    // pin enemies to their positions; when it hits 0 we detonate.
    if (this.voidTimer > 0) {
      this.voidTimer = Math.max(0, this.voidTimer - dt);
      // Freeze: zero all enemy XY drift this tick by holding them in place.
      for (const e of this.enemies) {
        // 2-second hold — we don't have per-enemy velocity, so we just
        // arrest movement by snapshotting + restoring after moveEnemies
        // runs. Cheaper to just rewind their step via a small pull-back.
        e.x -= 0; // no-op; the visible freeze comes from the slowdown below
        e.y -= 0;
      }
      // Push timeScale toward 0.2 for a slow-mo feel during the freeze.
      this.timeScale = Math.min(this.timeScale, 0.35);
      if (this.voidTimer === 0 && this.voidDmg > 0) {
        this.damageRadiusFx(this.x, this.y, 540, this.voidDmg, true);
        this.voidDmg = 0;
        this.timeScale = 1;
      }
    }

    // Toge Echo Wave — pending echoes re-fire after their timer.
    if (this.pendingEchoes.length) {
      const stillPending: typeof this.pendingEchoes = [];
      for (const echo of this.pendingEchoes) {
        echo.timer -= dt;
        if (echo.timer > 0) {
          stillPending.push(echo);
          continue;
        }
        // Re-fire the tech with reduced damage so echoes feel like
        // reverberations rather than full duplicates. Skip if the player
        // no longer owns the tech (e.g. swapped during draft). Set
        // `firingEcho` so the recursive fire doesn't schedule yet another
        // echo (and we don't loop forever).
        const owned = this.techniques.find((t) => t.id === echo.techId);
        if (!owned) continue;
        this.firingEcho = true;
        try {
          this.fireTechnique(owned, echo.dmg, echo.isCrit);
        } finally {
          this.firingEcho = false;
        }
      }
      this.pendingEchoes = stillPending;
    }

    // Toge Explode. ultimate — when the timer reaches 0 we detonate the
    // entire screen for big damage.
    if (this.explodeTimer > 0) {
      this.explodeTimer = Math.max(0, this.explodeTimer - dt);
      if (this.explodeTimer === 0 && this.explodeDmg > 0) {
        for (const e of this.enemies) {
          const mul = e.boss || e.elite ? this.eliteDmgMul : 1;
          e.hp -= this.explodeDmg * mul;
          this.hits.push({ x: e.x, y: e.y, elite: !!(e.boss || e.elite), crit: true });
        }
        const dead: SoloEnemy[] = [];
        for (const e of this.enemies) if (e.hp <= 0) dead.push(e);
        for (const e of dead) this.killEnemy(e);
        // Big global shockwave so the renderer can sell the moment.
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          this.spawnProjectile({
            kind: "forbidden_word",
            x: this.x + Math.cos(a) * 60,
            y: this.y + Math.sin(a) * 60,
            vx: Math.cos(a) * 540,
            vy: Math.sin(a) * 540,
            life: 0.7,
            damage: this.explodeDmg * 0.3,
            pierce: 99,
            angle: a,
          });
        }
        this.explodeDmg = 0;
      }
    }

    // Yuta Love Beam — sustained channel that spawns beam segments forward
    // every tick while the timer is live.
    if (this.loveBeamTimer > 0) {
      this.loveBeamTimer = Math.max(0, this.loveBeamTimer - dt);
      const aim = this.aimAngle;
      // 3 segments per tick spaced along the channel for a thick beam look.
      for (let i = 0; i < 3; i++) {
        const dist = 60 + i * 90;
        this.spawnProjectile({
          kind: "love_beam_seg",
          x: this.x + Math.cos(aim) * dist,
          y: this.y + Math.sin(aim) * dist,
          vx: Math.cos(aim) * 1200,
          vy: Math.sin(aim) * 1200,
          life: 0.2,
          damage: this.loveBeamDmg,
          pierce: 99,
          angle: aim,
          summon: true,
        });
      }
    }
  }

  private killEnemy(e: SoloEnemy) {
    this.exorcismCount++;
    this.streak++;
    if (this.streak > this.maxStreak) this.maxStreak = this.streak;
    this.streakDecaySec = 2.5;
    const mul = this.streakMultiplier();
    if (mul > this.lastStreakMul && mul >= 1.25) {
      this.lastStreakMul = mul;
      eventBus.emit({ kind: "streak", multiplier: mul, kills: this.streak });
    }
    const def = ENEMIES[e.typeId];
    const baseXp = def?.xp ?? 2;
    const eliteXpMul = e.elite || e.boss ? this.mutators.eliteXpMul : 1;
    this.pickups.push({
      id: nextId(),
      x: e.x,
      y: e.y,
      value: baseXp * eliteXpMul,
      kind: "xp",
    });
    // Elite/boss drops: small chance of health, rare bomb.
    if (e.elite || e.boss) {
      if (this.mutators.healDropEnabled && this.rng() < (e.boss ? 0.9 : 0.35)) {
        this.pickups.push({
          id: nextId(),
          x: e.x + 18,
          y: e.y + 8,
          value: e.boss ? 60 : 25,
          kind: "health",
        });
      }
      if (this.rng() < (e.boss ? 0.6 : 0.12)) {
        this.pickups.push({
          id: nextId(),
          x: e.x - 18,
          y: e.y + 8,
          value: 1,
          kind: "bomb",
        });
      }
    }
    this.enemies = this.enemies.filter((x) => x.id !== e.id);
    if (e.boss) this.bossHp = 0;
    // Predator Rage (Maki): each kill refreshes the buff window and adds a
    // stack (capped to the technique's level).
    const rage = this.techniques.find((t) => t.id === "predator_rage");
    if (rage) {
      this.predatorRageSec = 2.5;
      this.predatorRageStacks = Math.min(rage.level, this.predatorRageStacks + 1);
    }
    // Kills charge the ult meter (regular: +1, elite: +4, boss: +35).
    this.ultEnergy = Math.min(
      this.ultMax,
      this.ultEnergy + (e.boss ? 35 : e.elite ? 4 : 1)
    );
  }

  /**
   * Streak multiplier: gentler curve so XP doesn't snowball at high streaks.
   * Lowered substantially because, combined with the scaled XP curve, even
   * x1.4 on top of a big crowd-clear made levels feel instant.
   */
  streakMultiplier(): number {
    if (this.streak >= 80) return 1.3;
    if (this.streak >= 40) return 1.2;
    if (this.streak >= 20) return 1.12;
    if (this.streak >= 8) return 1.05;
    return 1;
  }

  /** Trigger dash in current move direction (or aim if no move). */
  dash() {
    if (this.dashCdSec > 0 || this.downed || this.phase !== "run") return;
    this.dashesUsed++;
    let dx = this.moveX;
    let dy = this.moveY;
    const len = Math.hypot(dx, dy);
    if (len < 0.1) {
      dx = Math.cos(this.aimAngle);
      dy = Math.sin(this.aimAngle);
    } else {
      dx /= len;
      dy /= len;
    }
    this.dashVx = dx;
    this.dashVy = dy;
    this.dashDurSec = 0.22;
    this.dashCdSec = 3;
    this.invulnSec = Math.max(this.invulnSec, 0.3);
    // Maki — Dodge Deflect: dashing carves a deflection arc that damages
    // and knocks back nearby enemies (we don't model hostile projectiles
    // in the engine, so we translate the "deflect bullets" fantasy into a
    // melee counter-stroke that scales with the passive's level).
    const deflect = this.techniques.find((t) => t.id === "dodge_deflect");
    if (deflect) {
      const range = 140 + deflect.level * 60;
      const dmg = 12 + deflect.level * 8;
      for (const e of this.enemies) {
        const ex = e.x - this.x;
        const ey = e.y - this.y;
        const dist = Math.hypot(ex, ey);
        if (dist > range) continue;
        e.hp -= dmg;
        if (dist > 1) {
          e.x += (ex / dist) * 24;
          e.y += (ey / dist) * 24;
        }
        this.hits.push({ x: e.x, y: e.y, elite: !!(e.boss || e.elite), crit: false });
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
    eventBus.emit({
      kind: "dash",
      x: this.x,
      y: this.y,
      angle: Math.atan2(dy, dx),
    });
  }

  private spawnEnemies(dt: number) {
    if (this.enemies.length >= 100) return;
    const stageMul = this.stageDef?.spawnRateMul ?? 1;
    const totalMul = this.mutators.spawnRateMul * stageMul;
    if (this.rng() > spawnRate(this.elapsed, 1) * dt * totalMul) return;
    // Spawn pool priority: Swarm Tide mutator wins (it's a thematic override),
    // otherwise the stage decides which mobs show up here. Falling back to
    // the full TRASH_ENEMY_IDS keeps Daily / Practice runs working when no
    // stage has been picked.
    const pool = this.mutators.swarmOnly
      ? (["swarm", "flyer"] as readonly string[])
      : this.stageDef?.enemyPool ?? TRASH_ENEMY_IDS;
    const typeId = pool[Math.floor(this.rng() * pool.length)];
    const def = ENEMIES[typeId];
    if (!def) return;
    // Swarm Tide makes everything frail.
    const hpMul = this.mutators.swarmOnly ? 0.6 : 1;
    const angle = this.rng() * Math.PI * 2;
    this.enemies.push({
      id: nextId(),
      typeId,
      x: this.x + Math.cos(angle) * 700,
      y: this.y + Math.sin(angle) * 700,
      hp: def.hp * hpMul,
      maxHp: def.hp * hpMul,
      elite: false,
      boss: false,
    });
    if (this.elapsed > 60 && this.rng() < 0.003 * this.mutators.eliteSpawnMul) {
      const elite = ["elite_grade1", "elite_grade2", "elite_grade3"][
        Math.floor(this.rng() * 3)
      ];
      const ed = ENEMIES[elite];
      this.enemies.push({
        id: nextId(),
        typeId: elite,
        x: this.x + (this.rng() - 0.5) * 300,
        y: this.y + (this.rng() - 0.5) * 300,
        hp: ed.hp,
        maxHp: ed.hp,
        elite: true,
        boss: false,
      });
    }
  }

  private spawnBoss() {
    // Stage gets first say on the boss roster (each map has thematic bosses);
    // fall back to the full boss list when no stage is picked (Daily, etc.).
    const stageBossPool = this.stageDef?.bossPool;
    const pool: readonly string[] =
      stageBossPool && stageBossPool.length ? stageBossPool : BOSS_IDS;
    const bossId = pool[Math.floor(this.rng() * pool.length)];
    const def = ENEMIES[bossId];
    if (!def) return;
    eventBus.emit({ kind: "boss_spawn", label: this.stageDef?.bossLabel });
    const bossHpMul = this.mutators.bossHpMul * (this.stageDef?.bossHpMul ?? 1);
    const finalHp = Math.round(def.hp * bossHpMul);
    this.enemies.push({
      id: nextId(),
      typeId: bossId,
      x: this.x,
      y: this.y - 200,
      hp: finalHp,
      maxHp: finalHp,
      elite: false,
      boss: true,
    });
    this.bossSpawned = true;
    this.bossHp = finalHp;
    this.bossMaxHp = finalHp;
  }

  private moveEnemies(dt: number) {
    for (const e of this.enemies) {
      const def = ENEMIES[e.typeId];
      if (!def) continue;
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * def.speed * dt;
      e.y += (dy / d) * def.speed * dt;
      if (e.boss && e.hp < e.maxHp * 0.5 && this.bossPhase < 2) {
        this.bossPhase = 2;
        eventBus.emit({ kind: "boss_phase2" });
      }
      if (e.boss) this.bossHp = e.hp;
    }
  }

  private enemyDamage(dt: number) {
    if (this.practiceMode) return;
    const maxDowns = MAX_DOWNS + this.effects.extraDowns;
    // Iterate snapshot — collect total dps in contact this frame and apply once
    // (also pauses regen by resetting outOfCombatSec).
    let dps = 0;
    for (const e of this.enemies) {
      const def = ENEMIES[e.typeId];
      if (!def || this.downed || this.spectating) continue;
      const d = Math.hypot(this.x - e.x, this.y - e.y);
      if (d < def.radius + 16) dps += def.damage;
    }
    if (dps <= 0) return;
    this.outOfCombatSec = 0;
    if (this.invulnSec > 0) return;
    if (this.downed || this.spectating) return;
    // Infinity (Gojo unlockable): roll once per damage tick.
    const infinity = this.techniques.find((t) => t.id === "infinity");
    if (infinity && this.rng() < Math.min(0.54, 0.18 * infinity.level)) {
      this.invulnSec = 0.35;
      return;
    }
    const dmg = dps * dt;
    this.hp -= dmg;
    this.damageTakenTotal += dmg;
    this.invulnSec = 0.35;
    if (this.hp <= 0) {
      this.downCount++;
      if (this.downCount >= maxDowns) {
        this.spectating = true;
        this.downed = true;
        eventBus.emit({ kind: "downed", username: "You" });
      } else {
        this.downed = true;
        this.hp = 0;
        eventBus.emit({ kind: "downed", username: "You" });
        setTimeout(() => {
          if (this.phase === "run" && this.downed) {
            this.downed = false;
            this.hp = this.maxHp * 0.4;
            eventBus.emit({ kind: "revived", username: "You" });
            this.emit();
          }
        }, REVIVE_CHANNEL_SEC * 1000);
      }
    }
  }

  /** Effective magnet radius (in world units) the player has right now */
  magnetRadius(): number {
    let mul = this.effects.magnetMul * this.mutators.magnetMul;
    for (const s of this.synergies) {
      if (s.effect.magnetMul) mul *= s.effect.magnetMul;
    }
    return 220 * mul;
  }

  pickupAbsorbRadius(): number {
    return 140;
  }

  private collectPickups() {
    const absorb = this.pickupAbsorbRadius();
    const magnet = this.magnetRadius();
    // Bon Appétit (Toge): +10% XP per level. Layered on top of meta/mutator XP.
    const bonAppetit = this.techniques.find((t) => t.id === "bon_appetit");
    const techXpMul = bonAppetit ? 1 + 0.1 * bonAppetit.level : 1;
    const xpMul = this.effects.xpMul * this.mutators.xpMul * techXpMul;
    const streakMul = this.streakMultiplier();
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const g = this.pickups[i];
      const d = Math.hypot(this.x - g.x, this.y - g.y);
      if (d < absorb) {
        if (g.kind === "health") {
          const heal = g.value * this.mutators.healValueMul;
          this.hp = Math.min(this.maxHp, this.hp + heal);
          eventBus.emit({ kind: "health_pickup", x: g.x, y: g.y, amount: heal });
        } else if (g.kind === "bomb") {
          // Bomb pickup: AoE around the player nuking trash, partial dmg to elite/boss.
          for (const e of this.enemies) {
            const ed = Math.hypot(this.x - e.x, this.y - e.y);
            if (ed > 380) continue;
            if (e.boss) e.hp -= 300;
            else if (e.elite) e.hp -= 220;
            else e.hp = 0;
          }
          // Clear dead trash from enemies list (boss/elite handled by kill chain below)
          const dead = this.enemies.filter((e) => e.hp <= 0);
          for (const e of dead) this.killEnemy(e);
          eventBus.emit({ kind: "info", message: "Curse Bomb!" });
        } else {
          // XP gem — apply streak multiplier on top of meta xpMul.
          const prev = this.level;
          const amount = g.value * xpMul * streakMul;
          this.xp += amount;
          // Use the scaled XP→level curve so leveling slows the higher you
          // climb. The HUD bar uses the same math via the snapshot below.
          this.level = levelFromXp(this.xp).level;
          eventBus.emit({ kind: "xp_gain", x: g.x, y: g.y, amount });
          if (this.level > prev) {
            eventBus.emit({ kind: "level_up", level: this.level });
            this.offerDraft();
          }
        }
        this.pickups.splice(i, 1);
      } else if (d < magnet) {
        // Smooth attraction curve (Tier 2 #8): near the edge of the magnet
        // radius the pull is gentle; as the pickup gets closer, the pull
        // accelerates non-linearly, giving the satisfying "vacuum" feel.
        const t = 1 - d / magnet;
        const pull = 0.05 + 0.5 * t * t;
        g.x += (this.x - g.x) * pull;
        g.y += (this.y - g.y) * pull;
      }
    }
  }

  private offerDraft() {
    // Spartan mutator delays the first draft until reaching a higher level.
    if (this.mutators.noDraftBeforeLevel > 0 && this.level < this.mutators.noDraftBeforeLevel) {
      return;
    }
    this.choosingUpgrade = true;
    this.timeScale = 0.1;
    this.refillDraftOptions();
  }

  /** End run from pause menu — keeps exorcism count for results */
  quitToResults() {
    this.endRun("quit");
  }

  private endRun(reason: string) {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.phase = "results";
    const count = this.exorcismCount;
    if (count > 400) this.grade = "Special Grade";
    else if (count > 250) this.grade = "Grade 1";
    else if (count > 120) this.grade = "Grade 2";
    else this.grade = "Grade 3";
    if (reason === "defeat") this.grade = "Exorcist Fallen";
    if (reason === "quit") this.grade = "Run ended";
    this.emit();
  }

  destroy() {
    // Stop the tick interval but DO NOT wipe `phase` / enemies / pickups.
    // `soloEngine` is a process-wide singleton; React 18 StrictMode dev
    // double-invokes effect cleanups, so a true reset here used to throw the
    // engine back to "lobby" right after Practice mode's auto-start scheduled
    // a "run" phase, leaving the HUD permanently hidden after one click.
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = undefined;
    this.listeners.clear();
  }
}

export const soloEngine = new SoloEngine();
