import Phaser from "phaser";
import { postProcessCanvas } from "./spritePostProcess";

const CHAR_IDS = [
  "yuji",
  "megumi",
  "nobara",
  "gojo",
  // New sorcerers — same anim pipeline (auto-built bob/squash sheet).
  "maki",
  "toge",
  "yuta",
] as const;

const ENEMY_ANIM_SOURCES = [
  "enemy_flyer",
  "enemy_charger",
  "enemy_swarm",
  "enemy_tank",
  "enemy_ranged",
  "enemy_exploder",
  "enemy_elite_grade1",
  "enemy_boss_jogo",
  "enemy_boss_hanami",
  "enemy_boss_mahito",
  // Villain roster — share the boss anim recipe but get their own keys so
  // tints + per-boss audio cues line up.
  "enemy_boss_sukuna",
  "enemy_boss_geto",
  "enemy_boss_toji",
] as const;

/** Elite tiers share one PNG — one anim sheet, many texture keys */
function enemyAnimKey(textureKey: string): string {
  if (textureKey.startsWith("enemy_elite_grade")) return "enemy_elite_grade1";
  return textureKey;
}

/** Build a horizontal spritesheet from one PNG with bob / squash frames */
function buildBobSheet(
  scene: Phaser.Scene,
  baseKey: string,
  sheetKey: string,
  frameCount: number,
  intensity: number
): { fw: number; fh: number } | null {
  if (!scene.textures.exists(baseKey)) return null;

  const source = scene.textures.get(baseKey).getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
  const w = source.width;
  const h = source.height;
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w * frameCount;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * Math.PI * 2;
    const bobY = Math.sin(t) * 8 * intensity;
    const scaleY = 1 + Math.cos(t) * 0.08 * intensity;
    const lean = Math.sin(t + Math.PI / 2) * 0.04 * intensity;
    const dx = i * w;

    ctx.save();
    ctx.translate(dx + w / 2, h / 2 + bobY);
    ctx.rotate(lean);
    ctx.scale(1, scaleY);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  postProcessCanvas(ctx, canvas.width, canvas.height);

  if (scene.textures.exists(sheetKey)) {
    scene.textures.remove(sheetKey);
  }
  scene.textures.addCanvas(sheetKey, canvas);
  const tex = scene.textures.get(sheetKey);
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (let i = 0; i < frameCount; i++) {
    tex.add(i, 0, i * w, 0, w, h);
  }
  return { fw: w, fh: h };
}

/**
 * Build a walk-cycle spritesheet by crossfading two source PNGs (a confident
 * idle pose and a mid-stride running pose) on top of the same bob / squash /
 * lean envelope used by `buildBobSheet`. The crossfade weight follows a
 * cosine so the step pose dominates at the peaks of the bob (when the foot
 * would plant) and the idle pose dominates at the troughs.
 *
 * The two PNGs are baked at the same target height (see spriteCleanup
 * BAKE_TARGET_H) so we can blit them at a shared frame size. If the step
 * texture is missing this function returns null and the caller falls back to
 * the single-PNG `buildBobSheet`.
 */
function buildWalkSheetFromTwo(
  scene: Phaser.Scene,
  baseKey: string,
  stepKey: string,
  sheetKey: string,
  frameCount: number,
  intensity: number
): { fw: number; fh: number } | null {
  if (!scene.textures.exists(baseKey) || !scene.textures.exists(stepKey)) return null;

  const baseSrc = scene.textures.get(baseKey).getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
  const stepSrc = scene.textures.get(stepKey).getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;

  const w = Math.max(baseSrc.width, stepSrc.width);
  const h = Math.max(baseSrc.height, stepSrc.height);
  if (!w || !h) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w * frameCount;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * Math.PI * 2;
    const bobY = Math.sin(t) * 8 * intensity;
    const scaleY = 1 + Math.cos(t) * 0.08 * intensity;
    const lean = Math.sin(t + Math.PI / 2) * 0.04 * intensity;
    const dx = i * w;
    // Cosine-shaped crossfade in [0,1]: 0 = pure idle, 1 = pure step.
    // Peaks twice per cycle so each "stride" reads as one foot plant.
    const stepW = (1 - Math.cos(t * 2)) * 0.5;

    ctx.save();
    ctx.translate(dx + w / 2, h / 2 + bobY);
    ctx.rotate(lean);
    ctx.scale(1, scaleY);

    // Idle pose underneath.
    ctx.globalAlpha = 1 - stepW;
    ctx.drawImage(baseSrc, -baseSrc.width / 2, -baseSrc.height / 2, baseSrc.width, baseSrc.height);

    // Step pose on top — crossfaded by stepW.
    ctx.globalAlpha = stepW;
    ctx.drawImage(stepSrc, -stepSrc.width / 2, -stepSrc.height / 2, stepSrc.width, stepSrc.height);

    ctx.restore();
  }

  postProcessCanvas(ctx, canvas.width, canvas.height);

  if (scene.textures.exists(sheetKey)) {
    scene.textures.remove(sheetKey);
  }
  scene.textures.addCanvas(sheetKey, canvas);
  const tex = scene.textures.get(sheetKey);
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (let i = 0; i < frameCount; i++) {
    tex.add(i, 0, i * w, 0, w, h);
  }
  return { fw: w, fh: h };
}

function ensureAnim(
  scene: Phaser.Scene,
  key: string,
  sheetKey: string,
  end: number,
  frameRate: number
) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end }),
    frameRate,
    repeat: -1,
  });
}

/** Call once from BootScene.create after images are loaded */
export function registerSpriteAnims(scene: Phaser.Scene) {
  for (const id of CHAR_IDS) {
    const base = `player_${id}`;
    const step = `${base}_step`;
    const idleSheet = `${base}_sheet_idle`;
    const walkSheet = `${base}_sheet_walk`;

    const idle = buildBobSheet(scene, base, idleSheet, 4, 0.45);
    // Prefer the dual-frame crossfade when a step PNG was preloaded; fall
    // back to the single-PNG bob if not.
    const walkFrames = 8;
    const walk =
      buildWalkSheetFromTwo(scene, base, step, walkSheet, walkFrames, 1.1) ??
      buildBobSheet(scene, base, walkSheet, walkFrames, 1.1);
    if (!idle || !walk) continue;

    ensureAnim(scene, `${id}_idle`, idleSheet, 3, 5);
    ensureAnim(scene, `${id}_walk`, walkSheet, walkFrames - 1, 12);
  }

  for (const key of ENEMY_ANIM_SOURCES) {
    const sheet = `${key}_sheet`;
    const isBoss = key.includes("boss");
    const frameCount = isBoss ? 6 : 4;
    const intensity = isBoss ? 1.1 : 0.55;
    const stepKey = `${key}_step`;
    const built = isBoss
      ? (buildWalkSheetFromTwo(scene, key, stepKey, sheet, frameCount, intensity) ??
          buildBobSheet(scene, key, sheet, frameCount, intensity))
      : buildBobSheet(scene, key, sheet, frameCount, intensity);
    if (!built) continue;
    const rate = isBoss ? 6 : key.includes("swarm") ? 14 : 8;
    ensureAnim(scene, `${key}_move`, sheet, frameCount - 1, rate);
  }

  const pickupSheet = "pickup_xp_sheet";
  if (buildBobSheet(scene, "pickup_xp", pickupSheet, 6, 0.35)) {
    ensureAnim(scene, "pickup_pulse", pickupSheet, 5, 10);
  }
}

export function playPlayerAnim(
  sprite: Phaser.GameObjects.Sprite,
  characterId: string,
  opts: { moving: boolean; downed: boolean; faceLeft: boolean }
) {
  // Defensive: Phaser sprites can race-condition into a destroyed state
  // during scene transitions or pause/resume (sprite.anims / sprite.scene
  // become undefined). Skip silently instead of throwing per-frame.
  if (!sprite || !sprite.anims || !sprite.scene || !sprite.scene.anims) return;
  if (opts.downed) {
    sprite.anims.stop();
    sprite.setAngle(-90);
    sprite.setFlipX(false);
    return;
  }
  sprite.setAngle(0);
  sprite.setFlipX(opts.faceLeft);

  const walkKey = `${characterId}_walk`;
  const idleKey = `${characterId}_idle`;
  const next = opts.moving && sprite.scene.anims.exists(walkKey) ? walkKey : idleKey;
  if (!sprite.scene.anims.exists(next)) return;
  if (sprite.anims.currentAnim?.key !== next) {
    sprite.play(next, true);
  }
}

export function playEnemyAnim(
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  moving: boolean
) {
  const animKey = `${enemyAnimKey(textureKey)}_move`;
  if (!moving || !sprite.scene.anims.exists(animKey)) {
    sprite.anims.stop();
    return;
  }
  if (sprite.anims.currentAnim?.key !== animKey) {
    sprite.play(animKey, true);
  }
}

export function playPickupAnim(sprite: Phaser.GameObjects.Sprite) {
  if (!sprite.scene.anims.exists("pickup_pulse")) return;
  if (sprite.anims.currentAnim?.key !== "pickup_pulse") {
    sprite.play("pickup_pulse", true);
  }
}
