import Phaser from "phaser";

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

  if (scene.textures.exists(sheetKey)) {
    scene.textures.remove(sheetKey);
  }
  scene.textures.addCanvas(sheetKey, canvas);
  const tex = scene.textures.get(sheetKey);
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
    const idleSheet = `${base}_sheet_idle`;
    const walkSheet = `${base}_sheet_walk`;

    const idle = buildBobSheet(scene, base, idleSheet, 4, 0.45);
    const walk = buildBobSheet(scene, base, walkSheet, 6, 1.1);
    if (!idle || !walk) continue;

    ensureAnim(scene, `${id}_idle`, idleSheet, 3, 5);
    ensureAnim(scene, `${id}_walk`, walkSheet, 5, 12);
  }

  for (const key of ENEMY_ANIM_SOURCES) {
    const sheet = `${key}_sheet`;
    const built = buildBobSheet(scene, key, sheet, 4, key.includes("boss") ? 0.9 : 0.55);
    if (!built) continue;
    const rate = key.includes("boss") ? 6 : key.includes("swarm") ? 14 : 8;
    ensureAnim(scene, `${key}_move`, sheet, 3, rate);
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
