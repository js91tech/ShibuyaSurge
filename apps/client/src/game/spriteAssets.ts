/** Custom sprite PNGs (generated art) — imported via Vite from repo `assets/` */
import yuji from "../../assets/yuji.png";
import megumi from "../../assets/megumi.png";
import nobara from "../../assets/nobara.png";
import gojo from "../../assets/gojo.png";
import maki from "../../assets/maki.png";
import toge from "../../assets/toge.png";
import yuta from "../../assets/yuta.png";
import yujiStep from "../../assets/yuji_step.png";
import megumiStep from "../../assets/megumi_step.png";
import nobaraStep from "../../assets/nobara_step.png";
import gojoStep from "../../assets/gojo_step.png";
import makiStep from "../../assets/maki_step.png";
import togeStep from "../../assets/toge_step.png";
import yutaStep from "../../assets/yuta_step.png";
import enemyFlyer from "../../assets/enemy_flyer.png";
import enemyCharger from "../../assets/enemy_charger.png";
import enemySwarm from "../../assets/enemy_swarm.png";
import enemyTank from "../../assets/enemy_tank.png";
import enemyRanged from "../../assets/enemy_ranged.png";
import enemyExploder from "../../assets/enemy_exploder.png";
import enemyElite from "../../assets/enemy_elite.png";
import enemyBoss from "../../assets/enemy_boss.png";
import enemyBossJogo from "../../assets/enemy_boss_jogo.png";
import enemyBossHanami from "../../assets/enemy_boss_hanami.png";
import enemyBossMahito from "../../assets/enemy_boss_mahito.png";
import enemyBossSukuna from "../../assets/enemy_boss_sukuna.png";
import enemyBossGeto from "../../assets/enemy_boss_geto.png";
import enemyBossToji from "../../assets/enemy_boss_toji.png";
import enemyBossJogoStep from "../../assets/enemy_boss_jogo_step.png";
import enemyBossHanamiStep from "../../assets/enemy_boss_hanami_step.png";
import enemyBossMahitoStep from "../../assets/enemy_boss_mahito_step.png";
import enemyBossSukunaStep from "../../assets/enemy_boss_sukuna_step.png";
import enemyBossGetoStep from "../../assets/enemy_boss_geto_step.png";
import enemyBossTojiStep from "../../assets/enemy_boss_toji_step.png";
import pickupXp from "../../assets/pickup_xp.png";

// Keep the legacy shared boss import so vite still resolves and so the boss
// art has a fallback if a per-boss asset ever fails to load. It is no longer
// referenced from SPRITE_URLS because each boss now ships its own PNG.
void enemyBoss;

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
  // Each boss now ships its own AI-generated art. The render path used to
  // apply a tint per boss type because the silhouette was shared; with unique
  // art the tint is collapsed to white (see BOSS_TINTS below) so the colours
  // render true.
  enemy_boss_jogo: enemyBossJogo,
  enemy_boss_hanami: enemyBossHanami,
  enemy_boss_mahito: enemyBossMahito,
  enemy_boss_sukuna: enemyBossSukuna,
  enemy_boss_geto: enemyBossGeto,
  enemy_boss_toji: enemyBossToji,
  pickup_xp: pickupXp,
};

/**
 * Optional second-pose PNG for the walk cycle. Sprite keys present here get
 * the dual-frame crossfade in `buildWalkSheetFromTwo` (see spriteAnims.ts);
 * keys absent here fall back to the single-PNG procedural bob.
 */
export const SPRITE_STEP_URLS: Record<string, string> = {
  player_yuji: yujiStep,
  player_megumi: megumiStep,
  player_nobara: nobaraStep,
  player_gojo: gojoStep,
  player_maki: makiStep,
  player_toge: togeStep,
  player_yuta: yutaStep,
  enemy_boss_jogo: enemyBossJogoStep,
  enemy_boss_hanami: enemyBossHanamiStep,
  enemy_boss_mahito: enemyBossMahitoStep,
  enemy_boss_sukuna: enemyBossSukunaStep,
  enemy_boss_geto: enemyBossGetoStep,
  enemy_boss_toji: enemyBossTojiStep,
};

/**
 * Per-boss-type tint applied at render time. Now that every boss has unique
 * AI art, we set the tint to white (0xffffff = identity) so the underlying
 * colour palette of each PNG renders unchanged. The map is kept for
 * backwards compatibility with code paths that still call setTint(BOSS_TINTS[id]).
 */
export const BOSS_TINTS: Record<string, number> = {
  boss_jogo: 0xffffff,
  boss_hanami: 0xffffff,
  boss_mahito: 0xffffff,
  boss_sukuna: 0xffffff,
  boss_geto: 0xffffff,
  boss_toji: 0xffffff,
};
