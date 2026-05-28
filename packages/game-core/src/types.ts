export type CharacterId =
  | "yuji"
  | "megumi"
  | "nobara"
  | "gojo"
  // New sorcerors (Tier 2 #25).
  | "maki"
  | "toge"
  | "yuta";

export type EnemyTypeId =
  | "flyer"
  | "charger"
  | "swarm"
  | "tank"
  | "ranged"
  | "exploder"
  | "elite_grade1"
  | "elite_grade2"
  | "elite_grade3"
  | "boss_jogo"
  | "boss_hanami"
  | "boss_mahito"
  // ── New villain bosses ─────────────────────────────────────────────
  | "boss_sukuna"
  | "boss_geto"
  | "boss_toji";

export type TechniqueId =
  | "divergent_fist"
  | "black_flash"
  | "divine_dogs"
  | "nue_bomb"
  | "straw_doll"
  | "resonance"
  | "blue_pull"
  | "red_push"
  | "hollow_purple"
  | "cursed_energy_regen"
  | "domain_expansion"
  | "movement_speed"
  // Unlockable secondaries (Tier 1 #3) — one per character.
  | "sukuna_slash"
  | "rabbit_escape"
  | "hairpin"
  | "infinity"
  // Pure synergy passives (Tier 3 #12) — granted when a pair of techs co-exist.
  | "team_synergy"
  // ── Generic projectile passives (available to every character). ─────
  | "multishot"
  | "piercing_shot"
  | "big_shots"
  | "swift_shots"
  // ── Yuji — speed brawler / combo rusher (red + black, white cracks). ──
  | "manji_kick" // secondary: spinning kick wave
  | "bloodlust" // passive (existing)
  | "awakened_vessel" // elite passive: shockwaves + combo scaling
  | "king_of_curses_momentum" // evolution active: orbiting cleaves + dash punches
  | "black_flash_barrage" // ultimate active: cinematic chain of cursed punches
  // ── Megumi — summoner / tactician (navy + black, blue eye-glow). ──────
  | "max_elephant" // evolution-ish active (existing, retuned)
  | "chimera_shadow" // passive: stronger summons (existing)
  | "shadow_frogs" // secondary: tongue-lash frogs that group-up enemies
  | "chimera_garden" // elite passive: shadow pools spawn extra summons
  | "ten_shadows_totality" // evolution active: fused giant shadow beasts
  | "shadow_domain" // ultimate active: endless shikigami nukes
  // ── Nobara — trapper / burst DPS (rusted red + black). ────────────────
  | "nail_burst" // existing active — wide fan
  | "cursed_brand" // passive (existing — bleed)
  | "floating_dolls" // elite passive: autonomous straw dolls fire nails
  | "black_flash_hairpin" // evolution active: massive ruptures
  | "nail_chains" // passive: chain explosions farther
  | "resonance_collapse" // ultimate active: simultaneous detonate + curse web
  // ── Gojo — glass cannon / screen clearer (cyan + violet). ─────────────
  | "lapse_field" // existing active — sustained ring
  | "six_eyes" // passive (existing — crit dmg)
  | "limitless_catastrophe" // evolution active: random Blue/Red collisions
  | "aoe_master" // passive: bonus damage vs grouped enemies
  | "unlimited_void" // ultimate active: freeze + cosmic detonation
  // ── New sorcerors. Each kit: basic, secondary, elite passive, evolution,
  // 3 character passives, ultimate active (8 techs total per character).
  // Maki — armor-break melee specialist (dark green / steel curse energy).
  | "cursed_tools" // display: "Split Spear Toss" — boomerang spear basic
  | "playful_cloud" // display: "Chain Kunai" — chained kunai secondary
  | "heavenly_restriction" // elite passive: speeds spear + spawns slash waves
  | "dragon_bone_cleaver" // evolution active: crescent black slashes
  | "close_combat" // passive: bonus dmg vs nearby enemies
  | "dodge_deflect" // passive: deflect enemy projectiles on dash
  | "predator_rage" // passive: atk speed buff after kills
  | "zenin_massacre" // ultimate active: rapid dash slashes everywhere
  // Toge — area-denial / debuff controller (violet / white curse energy).
  | "cursed_speech" // display: "Cursed Speech Pulse" — expanding rings basic
  | "dont_move" // display: "Don't Move Sigil" — delayed-detonation sigils
  | "bon_appetit" // passive: +XP per kill (existing)
  | "reverse_throat" // elite passive: speech detonates on kill, chain reactions
  | "forbidden_vocabulary" // evolution active: battlefield-wide commands
  | "status_spread" // passive: speech echo dmg pulses on every hit
  | "echo_wave" // passive: speech techs re-fire 1s later
  | "explode_word" // ultimate active: massive delayed sound burst
  // Yuta — balanced offense + Rika summon (cyan / black curse energy).
  | "rika_swing" // display: "Katana Wave" — fast blue-black crescents basic
  | "rika_throw" // display: "Rika Manifestation" — Rika fires giant fists
  | "copy_technique" // passive: re-fire any tech (existing)
  | "fully_manifested_rika" // elite passive: doubles your projectile count
  | "true_love_arsenal" // evolution active: rotating orbital katana + beam
  | "summon_scaling" // passive: summon dmg scales with kill streak
  | "crit_mini_rika" // passive: crits spawn mini Rika bites
  | "love_beam" // ultimate active: long continuous beam
  // ── Character evolution upgrades (granted in-run, not drafted). ─────
  | "divergent_black_chain"
  | "totality_dogs"
  | "resonant_rupture"
  | "precision_blue";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  color: number;
  maxHp: number;
  speed: number;
  starterTechnique: TechniqueId;
}

export interface TechniqueDef {
  id: TechniqueId;
  name: string;
  description: string;
  maxLevel: number;
  characterIds?: CharacterId[];
  tags: string[];
}

export interface EnemyDef {
  id: EnemyTypeId;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  radius: number;
  color: number;
  isElite?: boolean;
  isBoss?: boolean;
}
