import type { TechniqueDef, TechniqueId } from "./types.js";

export const TECHNIQUES: Record<TechniqueId, TechniqueDef> = {
  // ── Yuji Itadori (speed brawler, red + black + white cracks) ──────────
  // Basic — Divergent Fist. Fast punch projectile that lands a delayed
  // cursed-energy impact at the same spot ~0.25s later (the iconic
  // "double-hit" rhythm).
  divergent_fist: {
    id: "divergent_fist",
    name: "Divergent Fist",
    description: "Punch projectile + delayed cursed-energy impact at the same spot.",
    maxLevel: 8,
    characterIds: ["yuji"],
    tags: ["melee", "weapon"],
  },
  black_flash: {
    id: "black_flash",
    name: "Black Flash",
    description: "Passive: +8% crit chance per level. Crits crack space and buff attack speed briefly.",
    maxLevel: 5,
    characterIds: ["yuji"],
    tags: ["passive", "crit"],
  },
  // ── Megumi Fushiguro (summoner, navy + black + blue eye-glow) ─────────
  // Basic — Divine Dog Assault. Shadow wolves dash forward, biting through
  // a target before dissolving. Attack speed scales summon frequency.
  divine_dogs: {
    id: "divine_dogs",
    name: "Divine Dog Assault",
    description: "Shadow wolves dash forward, bite through targets, then dissolve.",
    maxLevel: 8,
    characterIds: ["megumi"],
    tags: ["summon", "weapon"],
  },
  nue_bomb: {
    id: "nue_bomb",
    name: "Nue Dive Bomb",
    description: "Periodic shadow lightning strike on dense clusters.",
    maxLevel: 5,
    characterIds: ["megumi"],
    tags: ["aoe", "summon"],
  },
  // ── Nobara Kugisaki (trapper / burst DPS, rusted red + black) ─────────
  // Basic — Cursed Nail Shot. Fast nails fly in straight lines, pierce
  // briefly, then embed at the impact point and detonate after a short
  // timer. Hairpin (secondary) force-detonates every embedded nail at once.
  straw_doll: {
    id: "straw_doll",
    name: "Cursed Nail Shot",
    description: "Fast nails embed at the impact point and detonate after a short delay.",
    maxLevel: 8,
    characterIds: ["nobara"],
    tags: ["ranged", "weapon"],
  },
  resonance: {
    id: "resonance",
    name: "Resonance",
    description: "Passive: marks elites for +12%/level damage; links splash a fraction of damage to the mark.",
    maxLevel: 5,
    characterIds: ["nobara"],
    tags: ["passive"],
  },
  // ── Gojo Satoru (glass cannon / screen clearer, cyan + violet) ────────
  // Basic — Blue. Compressed spatial spheres pull enemies inward and
  // implode on contact (a small gravity vortex per shot).
  blue_pull: {
    id: "blue_pull",
    name: "Blue",
    description: "Spatial spheres pull enemies inward and implode on contact.",
    maxLevel: 8,
    characterIds: ["gojo"],
    tags: ["magic", "weapon"],
  },
  red_push: {
    id: "red_push",
    name: "Red",
    description: "Explosive repulsion blast knocks enemies away and rings a shockwave outward.",
    maxLevel: 5,
    characterIds: ["gojo"],
    tags: ["magic", "weapon"],
  },
  hollow_purple: {
    id: "hollow_purple",
    name: "Hollow Purple",
    description: "Long-cooldown super-orb that deletes everything in its path and tears space behind it.",
    maxLevel: 3,
    characterIds: ["gojo"],
    tags: ["magic", "weapon"],
  },
  cursed_energy_regen: {
    id: "cursed_energy_regen",
    name: "Cursed Energy Flow",
    description: "Passive: −8% technique cooldown per level (compounding).",
    maxLevel: 5,
    tags: ["passive"],
  },
  domain_expansion: {
    id: "domain_expansion",
    name: "Domain Expansion",
    description: "Once per run: freeze arena and devastate.",
    maxLevel: 1,
    tags: ["ultimate"],
  },
  movement_speed: {
    id: "movement_speed",
    name: "Footwork Training",
    description: "Passive: +6% movement speed per level.",
    maxLevel: 5,
    tags: ["passive"],
  },
  // ── Secondary unlockable techniques (one per character) ────────────────
  sukuna_slash: {
    id: "sukuna_slash",
    name: "Sukuna's Slash",
    description: "Wide cleave erupts from Yuji's vessel.",
    maxLevel: 5,
    characterIds: ["yuji"],
    tags: ["melee", "weapon", "unlock"],
  },
  rabbit_escape: {
    id: "rabbit_escape",
    name: "Rabbit Escape",
    description: "Burst of summon rabbits scatters and bites.",
    maxLevel: 5,
    characterIds: ["megumi"],
    tags: ["summon", "weapon", "unlock"],
  },
  hairpin: {
    id: "hairpin",
    name: "Hairpin",
    description: "Tossed hairpins detonate on contact.",
    maxLevel: 5,
    characterIds: ["nobara"],
    tags: ["ranged", "weapon", "unlock"],
  },
  infinity: {
    id: "infinity",
    name: "Infinity",
    description: "Passive: 18% chance to ignore incoming damage per level (max 3 stacks).",
    maxLevel: 3,
    characterIds: ["gojo"],
    tags: ["passive", "unlock"],
  },
  // Synergy passive — only granted when prerequisites are met (see SYNERGY_PAIRS).
  team_synergy: {
    id: "team_synergy",
    name: "Team Synergy",
    description: "Carried by character pairs — see synergy hints in draft.",
    maxLevel: 3,
    tags: ["passive", "synergy"],
  },

  // ── Generic projectile passives ────────────────────────────────────────
  multishot: {
    id: "multishot",
    name: "Multishot",
    description: "Passive: each projectile spawns +1 sister shot per level (max 3).",
    maxLevel: 3,
    tags: ["passive", "projectile"],
  },
  piercing_shot: {
    id: "piercing_shot",
    name: "Piercing Shot",
    description: "Passive: projectiles pierce +1 additional enemy per level.",
    maxLevel: 5,
    tags: ["passive", "projectile"],
  },
  big_shots: {
    id: "big_shots",
    name: "Big Shots",
    description: "Passive: +18% projectile collision radius per level.",
    maxLevel: 5,
    tags: ["passive", "projectile"],
  },
  swift_shots: {
    id: "swift_shots",
    name: "Swift Shots",
    description: "Passive: +22% projectile travel speed per level.",
    maxLevel: 5,
    tags: ["passive", "projectile"],
  },

  // ── Yuji Itadori (full kit) ───────────────────────────────────────────
  manji_kick: {
    id: "manji_kick",
    name: "Manji Kick",
    description: "Spinning cone kick wave — short-range burst that punts enemies back.",
    maxLevel: 5,
    characterIds: ["yuji"],
    tags: ["melee", "weapon", "aoe"],
  },
  bloodlust: {
    id: "bloodlust",
    name: "Bloodlust",
    description: "Passive: deal +25% damage per level while below 50% HP.",
    maxLevel: 4,
    characterIds: ["yuji"],
    tags: ["passive"],
  },
  awakened_vessel: {
    id: "awakened_vessel",
    name: "Awakened Vessel",
    description: "Elite passive: each Divergent Fist emits a shockwave; Black Flash crits chain-explode.",
    maxLevel: 4,
    characterIds: ["yuji"],
    tags: ["passive"],
  },
  king_of_curses_momentum: {
    id: "king_of_curses_momentum",
    name: "King of Curses Momentum",
    description: "Evolution: cleaving slashes orbit Yuji, and every cast dash-punches across the field.",
    maxLevel: 5,
    characterIds: ["yuji"],
    tags: ["melee", "weapon", "aoe"],
  },
  black_flash_barrage: {
    id: "black_flash_barrage",
    name: "Black Flash Barrage",
    description: "Ultimate path: rapid cinematic chain of cursed punches that ends in a massive black-red blast.",
    maxLevel: 3,
    characterIds: ["yuji"],
    tags: ["ultimate"],
  },

  // ── Megumi Fushiguro (full kit) ───────────────────────────────────────
  max_elephant: {
    id: "max_elephant",
    name: "Max Elephant",
    description: "Massive water-shadow elephant blast crushes a forward arc.",
    maxLevel: 5,
    characterIds: ["megumi"],
    tags: ["summon", "aoe", "weapon"],
  },
  chimera_shadow: {
    id: "chimera_shadow",
    name: "Chimera Shadow Garden",
    description: "Passive: Divine Dog wolves +25%/level damage and spawn +1 extra wolf per cast.",
    maxLevel: 4,
    characterIds: ["megumi"],
    tags: ["passive", "summon"],
  },
  shadow_frogs: {
    id: "shadow_frogs",
    name: "Shadow Frogs",
    description: "Frogs leap into the crowd; tongue lashes pull enemies together for AoE follow-ups.",
    maxLevel: 5,
    characterIds: ["megumi"],
    tags: ["summon", "weapon"],
  },
  chimera_garden: {
    id: "chimera_garden",
    name: "Chimera Garden",
    description: "Elite passive: shadow pools spawn under Megumi — summons inside hit harder and faster.",
    maxLevel: 3,
    characterIds: ["megumi"],
    tags: ["passive", "summon"],
  },
  ten_shadows_totality: {
    id: "ten_shadows_totality",
    name: "Ten Shadows Totality",
    description: "Evolution: summons fuse into giant shadow beasts that crash across the battlefield.",
    maxLevel: 5,
    characterIds: ["megumi"],
    tags: ["summon", "weapon", "aoe"],
  },
  shadow_domain: {
    id: "shadow_domain",
    name: "Shadow Domain",
    description: "Ultimate path: the screen darkens — endless shikigami strike from every direction.",
    maxLevel: 3,
    characterIds: ["megumi"],
    tags: ["ultimate"],
  },

  // ── Nobara Kugisaki (full kit) ────────────────────────────────────────
  nail_burst: {
    id: "nail_burst",
    name: "Nail Burst",
    description: "Tight fan of high-velocity nails fires forward — nails embed and detonate on Hairpin.",
    maxLevel: 5,
    characterIds: ["nobara"],
    tags: ["ranged", "weapon", "projectile"],
  },
  cursed_brand: {
    id: "cursed_brand",
    name: "Cursed Brand",
    description: "Passive: enemy hits suffer a 2s bleed for +20% damage per level.",
    maxLevel: 4,
    characterIds: ["nobara"],
    tags: ["passive"],
  },
  floating_dolls: {
    id: "floating_dolls",
    name: "Floating Straw Dolls",
    description: "Elite passive: autonomous straw dolls orbit Nobara and periodically fire cursed nails.",
    maxLevel: 3,
    characterIds: ["nobara"],
    tags: ["passive", "summon"],
  },
  black_flash_hairpin: {
    id: "black_flash_hairpin",
    name: "Black Flash Hairpin",
    description: "Evolution: detonations become huge black-red ruptures and split into cursed fragments.",
    maxLevel: 5,
    characterIds: ["nobara"],
    tags: ["ranged", "weapon", "aoe"],
  },
  nail_chains: {
    id: "nail_chains",
    name: "Curse Chains",
    description: "Passive: nail detonations chain to enemies up to +60 px farther per level.",
    maxLevel: 4,
    characterIds: ["nobara"],
    tags: ["passive"],
  },
  resonance_collapse: {
    id: "resonance_collapse",
    name: "Resonance Collapse",
    description: "Ultimate path: every embedded nail detonates simultaneously inside a giant curse web.",
    maxLevel: 3,
    characterIds: ["nobara"],
    tags: ["ultimate"],
  },

  // ── Gojo Satoru (full kit) ────────────────────────────────────────────
  lapse_field: {
    id: "lapse_field",
    name: "Lapse Field",
    description: "Sustained cyan ring that slows and damages enemies around Gojo.",
    maxLevel: 5,
    characterIds: ["gojo"],
    tags: ["magic", "aoe"],
  },
  six_eyes: {
    id: "six_eyes",
    name: "Six Eyes",
    description: "Passive: +30% crit damage per level and 4% cooldown reduction (stacks with Black Flash).",
    maxLevel: 4,
    characterIds: ["gojo"],
    tags: ["passive", "crit"],
  },
  limitless_catastrophe: {
    id: "limitless_catastrophe",
    name: "Limitless Catastrophe",
    description: "Evolution: random Blue/Red collisions erupt across the screen and sweep purple beams.",
    maxLevel: 5,
    characterIds: ["gojo"],
    tags: ["magic", "weapon", "aoe"],
  },
  aoe_master: {
    id: "aoe_master",
    name: "Spatial Mastery",
    description: "Passive: +12% damage per level vs enemies clustered within 140 px of each other.",
    maxLevel: 4,
    characterIds: ["gojo"],
    tags: ["passive"],
  },
  unlimited_void: {
    id: "unlimited_void",
    name: "Unlimited Void",
    description: "Ultimate path: the field freezes — cosmic eye seals enemies before a delayed psychic detonation.",
    maxLevel: 3,
    characterIds: ["gojo"],
    tags: ["ultimate"],
  },

  // ── Maki Zenin (armor-break melee, dark green / steel) ────────────────
  // Starter — Split Spear Toss. The thrown spear pierces forward then
  // boomerangs back to Maki; bonus shockwave damage on the return hit.
  cursed_tools: {
    id: "cursed_tools",
    name: "Split Spear Toss",
    description: "Throw a cursed spear that pierces and boomerangs back with a shockwave.",
    maxLevel: 8,
    characterIds: ["maki"],
    tags: ["melee", "weapon"],
  },
  // Secondary — Chain Kunai. Three tethered kunai fire in a cone, tagging
  // enemies for bonus melee damage from the spear.
  playful_cloud: {
    id: "playful_cloud",
    name: "Chain Kunai",
    description: "Cone of 3 chained kunai tethers enemies; tagged foes take +melee damage.",
    maxLevel: 5,
    characterIds: ["maki"],
    tags: ["ranged", "weapon"],
  },
  // Elite upgrade — Heavenly Restriction. Maki has no cursed energy, so the
  // tradeoff buff is brutal physical output: spear cadence skyrockets and
  // each throw spawns an invisible afterimage slash beside her.
  heavenly_restriction: {
    id: "heavenly_restriction",
    name: "Heavenly Restriction",
    description: "Spear throws speed up and spawn invisible afterimage slashes nearby.",
    maxLevel: 5,
    characterIds: ["maki"],
    tags: ["passive"],
  },
  // Evolution weapon — Dragon-Bone Cleaver. Replaces the spear with a giant
  // cursed blade that arcs crescent slashes outward.
  dragon_bone_cleaver: {
    id: "dragon_bone_cleaver",
    name: "Dragon-Bone Cleaver",
    description: "Arc a giant cursed blade: crescent slashes fan outward; crits fracture ground.",
    maxLevel: 5,
    characterIds: ["maki"],
    tags: ["melee", "weapon", "aoe"],
  },
  close_combat: {
    id: "close_combat",
    name: "Close Combat",
    description: "Passive: +10% damage per level against enemies within 160 px.",
    maxLevel: 5,
    characterIds: ["maki"],
    tags: ["passive"],
  },
  dodge_deflect: {
    id: "dodge_deflect",
    name: "Dodge Deflect",
    description: "Passive: dashing deflects enemy projectiles in a 200 px arc per level.",
    maxLevel: 3,
    characterIds: ["maki"],
    tags: ["passive"],
  },
  predator_rage: {
    id: "predator_rage",
    name: "Predator Rage",
    description: "Passive: each kill grants +8% attack speed for 2s (stacks up to L× per level).",
    maxLevel: 4,
    characterIds: ["maki"],
    tags: ["passive"],
  },
  zenin_massacre: {
    id: "zenin_massacre",
    name: "Zenin Massacre",
    description: "Ultimate path: invisible dash slashes carve across the entire screen.",
    maxLevel: 3,
    characterIds: ["maki"],
    tags: ["ultimate"],
  },

  // ── Toge Inumaki (area denial + debuffs, violet / white) ──────────────
  // Starter — Cursed Speech Pulse. Concentric rings expand outward and
  // apply random debuffs to anything they pass through.
  cursed_speech: {
    id: "cursed_speech",
    name: "Cursed Speech Pulse",
    description: "Expanding sound rings pierce enemies and apply random curse debuffs.",
    maxLevel: 8,
    characterIds: ["toge"],
    tags: ["ranged", "weapon", "aoe"],
  },
  // Secondary — Don't Move Sigil. Floating kanji over enemies detonates
  // after a short delay, rooting and damaging.
  dont_move: {
    id: "dont_move",
    name: "Don't Move Sigil",
    description: "Drop curse sigils on enemies that detonate after a delay, rooting in place.",
    maxLevel: 5,
    characterIds: ["toge"],
    tags: ["magic", "aoe", "weapon"],
  },
  bon_appetit: {
    id: "bon_appetit",
    name: "Bon Appétit",
    description: "Passive: +10% XP from each kill per level.",
    maxLevel: 4,
    characterIds: ["toge"],
    tags: ["passive"],
  },
  reverse_throat: {
    id: "reverse_throat",
    name: "Reverse Throat",
    description: "Elite passive: speech no longer hurts Toge; kills trigger chain explosions.",
    maxLevel: 4,
    characterIds: ["toge"],
    tags: ["passive"],
  },
  forbidden_vocabulary: {
    id: "forbidden_vocabulary",
    name: "Forbidden Vocabulary",
    description: "Evolution: shouts become battlefield-wide kanji commands that strike everywhere.",
    maxLevel: 5,
    characterIds: ["toge"],
    tags: ["magic", "weapon", "aoe"],
  },
  status_spread: {
    id: "status_spread",
    name: "Cursed Contagion",
    description: "Passive: each hit splashes secondary curse damage to enemies within 80 px.",
    maxLevel: 4,
    characterIds: ["toge"],
    tags: ["passive"],
  },
  echo_wave: {
    id: "echo_wave",
    name: "Echo Wave",
    description: "Passive: speech techniques re-fire after 1.1s for 60% damage per level.",
    maxLevel: 3,
    characterIds: ["toge"],
    tags: ["passive"],
  },
  explode_word: {
    id: "explode_word",
    name: "Explode.",
    description: "Ultimate path: massive delayed sound burst nukes everything on-screen.",
    maxLevel: 3,
    characterIds: ["toge"],
    tags: ["ultimate"],
  },

  // ── Yuta Okkotsu (balanced offense + Rika companion, cyan / black) ────
  // Starter — Katana Wave. Slashes fire blue-black crescent projectiles at
  // medium range, fast attack speed.
  rika_swing: {
    id: "rika_swing",
    name: "Katana Wave",
    description: "Slashes send fast blue-black crescent arcs forward in a tight fan.",
    maxLevel: 8,
    characterIds: ["yuta"],
    tags: ["melee", "weapon"],
  },
  // Secondary — Rika Manifestation. Rika briefly appears behind Yuta and
  // hurls giant cursed fists that home on elite enemies.
  rika_throw: {
    id: "rika_throw",
    name: "Rika Manifestation",
    description: "Rika appears and hurls giant cursed fists that home on elite targets.",
    maxLevel: 5,
    characterIds: ["yuta"],
    tags: ["summon", "weapon", "projectile"],
  },
  copy_technique: {
    id: "copy_technique",
    name: "Copy",
    description: "Passive: 8% chance per level for any fired tech to fire a second time.",
    maxLevel: 4,
    characterIds: ["yuta"],
    tags: ["passive"],
  },
  fully_manifested_rika: {
    id: "fully_manifested_rika",
    name: "Fully Manifested Rika",
    description: "Elite passive: Rika mirrors your attacks — every projectile fires twice.",
    maxLevel: 3,
    characterIds: ["yuta"],
    tags: ["passive", "summon"],
  },
  true_love_arsenal: {
    id: "true_love_arsenal",
    name: "True Love Arsenal",
    description: "Evolution: rotating cursed orbitals — slash waves + spirit beams together.",
    maxLevel: 5,
    characterIds: ["yuta"],
    tags: ["summon", "weapon", "aoe"],
  },
  summon_scaling: {
    id: "summon_scaling",
    name: "Spirit Bond",
    description: "Passive: Rika summons gain +2% damage per kill in the run (max +60%/level).",
    maxLevel: 3,
    characterIds: ["yuta"],
    tags: ["passive", "summon"],
  },
  crit_mini_rika: {
    id: "crit_mini_rika",
    name: "Mini Rika Bites",
    description: "Passive: critical hits spawn a homing mini-Rika that bites a nearby foe.",
    maxLevel: 4,
    characterIds: ["yuta"],
    tags: ["passive", "crit"],
  },
  love_beam: {
    id: "love_beam",
    name: "Love Beam",
    description: "Ultimate path: continuous cyan cursed-energy beam carves the battlefield with Rika.",
    maxLevel: 3,
    characterIds: ["yuta"],
    tags: ["ultimate"],
  },
  divergent_black_chain: {
    id: "divergent_black_chain",
    name: "Black Flash Chain",
    description: "Evolved Divergent Fist — crits chain an extra delayed impact.",
    maxLevel: 8,
    characterIds: ["yuji"],
    tags: ["melee", "weapon", "evolution"],
  },
  totality_dogs: {
    id: "totality_dogs",
    name: "Totality Hounds",
    description: "Evolved Divine Dogs — fewer wolves, heavier bites and cleave.",
    maxLevel: 8,
    characterIds: ["megumi"],
    tags: ["summon", "weapon", "evolution"],
  },
  resonant_rupture: {
    id: "resonant_rupture",
    name: "Resonant Rupture",
    description: "Evolved nails — larger embed detonations on marked targets.",
    maxLevel: 8,
    characterIds: ["nobara"],
    tags: ["ranged", "weapon", "evolution"],
  },
  precision_blue: {
    id: "precision_blue",
    name: "Precision Blue",
    description: "Evolved Blue — stronger pull and smarter cluster targeting.",
    maxLevel: 8,
    characterIds: ["gojo"],
    tags: ["magic", "weapon", "evolution"],
  },
};

/**
 * Pair synergies (Tier 3 #12). The engine checks owned tech IDs against this
 * table and applies the bonus when both ids on either side are present.
 */
export interface SynergyPair {
  ids: [TechniqueId, TechniqueId];
  label: string;
  effect: {
    /** Multiplier on base technique damage when active. */
    techDmgMul?: number;
    /** Flat cooldown reduction (seconds) on all techs. */
    cooldownSub?: number;
    /** Bonus crit chance added to Black Flash. */
    critBonus?: number;
    /** Bonus magnet radius multiplier. */
    magnetMul?: number;
  };
}

export const SYNERGY_PAIRS: SynergyPair[] = [
  {
    ids: ["divergent_fist", "black_flash"],
    label: "Vessel Awakening",
    effect: { techDmgMul: 1.1, critBonus: 0.05 },
  },
  {
    ids: ["divine_dogs", "nue_bomb"],
    label: "Ten Shadows",
    effect: { cooldownSub: 0.1 },
  },
  {
    ids: ["straw_doll", "resonance"],
    label: "Curse Hunt",
    effect: { techDmgMul: 1.08 },
  },
  {
    ids: ["blue_pull", "red_push"],
    label: "Lapse / Reversal",
    effect: { techDmgMul: 1.15, cooldownSub: 0.05 },
  },
  {
    ids: ["hollow_purple", "infinity"],
    label: "Limitless",
    effect: { techDmgMul: 1.2, critBonus: 0.05 },
  },
  {
    ids: ["sukuna_slash", "movement_speed"],
    label: "Predator",
    effect: { magnetMul: 1.25 },
  },
  // ── New synergies for new characters / new specifics ────────────────
  {
    ids: ["cursed_tools", "playful_cloud"],
    label: "Heavy Hands",
    effect: { techDmgMul: 1.12 },
  },
  {
    ids: ["cursed_speech", "dont_move"],
    label: "Voice of Command",
    effect: { cooldownSub: 0.12 },
  },
  {
    ids: ["rika_swing", "rika_throw"],
    label: "Rika Awakening",
    effect: { techDmgMul: 1.15, critBonus: 0.04 },
  },
  {
    ids: ["multishot", "piercing_shot"],
    label: "Volley Mastery",
    effect: { techDmgMul: 1.08 },
  },
  {
    ids: ["big_shots", "swift_shots"],
    label: "Heavy Velocity",
    effect: { techDmgMul: 1.1 },
  },
  // ── Character signature synergies (Maki / Toge / Yuta) ──────────
  // Maki + Swift Shots → Phantom Weapon Style: dozens of invisible slashes
  // because every spear throw now leaves a high-velocity afterimage.
  {
    ids: ["cursed_tools", "swift_shots"],
    label: "Phantom Weapon Style",
    effect: { techDmgMul: 1.18, cooldownSub: 0.05 },
  },
  // Toge + Cursed Energy Flow → Domain Broadcast: cooldowns plummet so the
  // whole screen pulses with Toge's commands.
  {
    ids: ["cursed_speech", "cursed_energy_regen"],
    label: "Domain Broadcast",
    effect: { cooldownSub: 0.18 },
  },
  // Yuta + Chimera Shadow Garden → Queen of Curses: Rika & shadow garden
  // overflow with summons that hit harder and faster.
  {
    ids: ["rika_throw", "chimera_shadow"],
    label: "Queen of Curses",
    effect: { techDmgMul: 1.2, critBonus: 0.05 },
  },
  // ── Character signature synergies (Yuji / Megumi / Nobara / Gojo) ──
  // Yuji + Awakened Vessel → Black Flash crits feed combo scaling.
  {
    ids: ["divergent_fist", "awakened_vessel"],
    label: "Sukuna's Wake",
    effect: { techDmgMul: 1.18, critBonus: 0.06 },
  },
  // Megumi + Ten Shadows Totality → giant beasts trigger off Chimera buffs.
  {
    ids: ["ten_shadows_totality", "chimera_shadow"],
    label: "Ten Shadows Manifest",
    effect: { techDmgMul: 1.2, cooldownSub: 0.08 },
  },
  // Nobara + Black Flash Hairpin → Curse Web Mastery: every detonation
  // resonates with the marked target.
  {
    ids: ["black_flash_hairpin", "resonance"],
    label: "Curse Web Mastery",
    effect: { techDmgMul: 1.18 },
  },
  // Gojo + Limitless Catastrophe → Sage of Limitless: Six Eyes makes the
  // catastrophe auto-target with brutal precision.
  {
    ids: ["limitless_catastrophe", "six_eyes"],
    label: "Sage of Limitless",
    effect: { techDmgMul: 1.22, critBonus: 0.06 },
  },
];

/** Aggregate synergy bonuses for the techniques the player currently owns. */
export function activeSynergies(ownedIds: TechniqueId[]): SynergyPair[] {
  const owned = new Set(ownedIds);
  return SYNERGY_PAIRS.filter((s) => owned.has(s.ids[0]) && owned.has(s.ids[1]));
}

export const TECHNIQUE_LIST = Object.values(TECHNIQUES);

/** In-run weapon evolutions — granted when base weapon is maxed and prereqs are owned. */
export interface EvolutionRecipe {
  baseId: TechniqueId;
  evolvedId: TechniqueId;
  /** All must be owned at max level. */
  requires: TechniqueId[];
}

export const EVOLUTIONS: EvolutionRecipe[] = [
  {
    baseId: "divergent_fist",
    evolvedId: "divergent_black_chain",
    requires: ["black_flash"],
  },
  {
    baseId: "divine_dogs",
    evolvedId: "totality_dogs",
    requires: ["chimera_shadow"],
  },
  {
    baseId: "straw_doll",
    evolvedId: "resonant_rupture",
    requires: ["resonance"],
  },
  {
    baseId: "blue_pull",
    evolvedId: "precision_blue",
    requires: ["six_eyes"],
  },
];

export interface DraftFilterOptions {
  banPassive?: boolean;
  banWeapon?: boolean;
  weaponMaxLevelBonus?: number;
}

function effectiveMaxLevel(def: TechniqueDef, bonus: number): number {
  if (!def.tags.includes("weapon")) return def.maxLevel;
  return def.maxLevel + bonus;
}

/** Replace maxed base weapons with evolutions when recipes are satisfied. */
export function applyEvolutionsToLoadout(
  owned: { id: TechniqueId; level: number }[],
  weaponMaxLevelBonus = 0
): { id: TechniqueId; level: number }[] {
  const out = owned.map((t) => ({ ...t }));
  const levelOf = (id: TechniqueId) => out.find((t) => t.id === id)?.level ?? 0;
  const hasMax = (id: TechniqueId) => {
    const def = TECHNIQUES[id];
    if (!def) return false;
    return levelOf(id) >= effectiveMaxLevel(def, weaponMaxLevelBonus);
  };

  for (const evo of EVOLUTIONS) {
    if (out.some((t) => t.id === evo.evolvedId)) continue;
    const base = out.find((t) => t.id === evo.baseId);
    if (!base || !hasMax(evo.baseId)) continue;
    if (!evo.requires.every((r) => hasMax(r))) continue;
    base.id = evo.evolvedId;
    base.level = Math.max(1, base.level);
  }
  return out;
}

export function getDraftOptions(
  ownedIds: TechniqueId[],
  characterId: string,
  ownedLevels: Record<string, number> = {},
  count = 3,
  unlockedExtras: TechniqueId[] = [],
  filter: DraftFilterOptions = {}
): TechniqueId[] {
  const unlockedSet = new Set(unlockedExtras);
  const weaponBonus = filter.weaponMaxLevelBonus ?? 0;
  const pool = TECHNIQUE_LIST.filter((t) => {
    const level = ownedLevels[t.id] ?? 0;
    if (level >= effectiveMaxLevel(t, weaponBonus)) return false;
    if (t.characterIds && !t.characterIds.includes(characterId as never)) return false;
    if (t.tags.includes("synergy")) return false;
    if (t.tags.includes("evolution")) return false;
    if (t.tags.includes("ultimate")) return false;
    if (filter.banPassive && t.tags.includes("passive")) return false;
    if (filter.banWeapon && t.tags.includes("weapon")) return false;
    if (t.tags.includes("unlock") && !unlockedSet.has(t.id)) return false;
    return true;
  }).map((t) => t.id);

  const picks: TechniqueId[] = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const id of shuffled) {
    if (picks.length >= count) break;
    if (!picks.includes(id)) picks.push(id);
  }
  while (picks.length < count && shuffled.length) {
    picks.push(shuffled[picks.length % shuffled.length]);
  }
  return picks;
}
