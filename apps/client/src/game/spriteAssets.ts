/** Custom sprite PNGs (generated art) — imported via Vite from repo `assets/` */
import yuji from "../../../../../assets/yuji.png";
import megumi from "../../../../../assets/megumi.png";
import nobara from "../../../../../assets/nobara.png";
import gojo from "../../../../../assets/gojo.png";
import maki from "../../../../../assets/maki.png";
import toge from "../../../../../assets/toge.png";
import yuta from "../../../../../assets/yuta.png";
import enemyFlyer from "../../../../../assets/enemy_flyer.png";
import enemyCharger from "../../../../../assets/enemy_charger.png";
import enemySwarm from "../../../../../assets/enemy_swarm.png";
import enemyTank from "../../../../../assets/enemy_tank.png";
import enemyRanged from "../../../../../assets/enemy_ranged.png";
import enemyExploder from "../../../../../assets/enemy_exploder.png";
import enemyElite from "../../../../../assets/enemy_elite.png";
import enemyBoss from "../../../../../assets/enemy_boss.png";
import pickupXp from "../../../../../assets/pickup_xp.png";

export const SPRITE_URLS: Record<string, string> = {
  player_yuji: yuji,
  player_megumi: megumi,
  player_nobara: nobara,
  player_gojo: gojo,
  player_maki: maki,
  player_toge: toge,
  player_yuta: yuta,
  enemy_flyer: enemyFlyer,
  enemy_charger: enemyCharger,
  enemy_swarm: enemySwarm,
  enemy_tank: enemyTank,
  enemy_ranged: enemyRanged,
  enemy_exploder: enemyExploder,
  enemy_elite_grade1: enemyElite,
  enemy_elite_grade2: enemyElite,
  enemy_elite_grade3: enemyElite,
  enemy_boss_jogo: enemyBoss,
  // New bosses (Tier 1 #4) reuse the existing boss artwork. The render path
  // applies a tint per boss type so they read as distinct on screen until we
  // commission dedicated art.
  enemy_boss_hanami: enemyBoss,
  enemy_boss_mahito: enemyBoss,
  // Villain roster — also tinted variants of the shared boss sprite.
  enemy_boss_sukuna: enemyBoss,
  enemy_boss_geto: enemyBoss,
  enemy_boss_toji: enemyBoss,
  pickup_xp: pickupXp,
};

/** Per-boss-type tint applied at render time for visual variety. */
export const BOSS_TINTS: Record<string, number> = {
  boss_jogo: 0xff6b4a,
  boss_hanami: 0x4ade80,
  boss_mahito: 0xff4a8c,
  // Crimson Sukuna, indigo Geto, near-black Toji to keep the silhouettes
  // visually distinct from the trio of original bosses.
  boss_sukuna: 0xdc2626,
  boss_geto: 0x6366f1,
  boss_toji: 0x111827,
};
