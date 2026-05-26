import Phaser from "phaser";
import { playerDisplayScale, enemyDisplayScale, pickupDisplayScale } from "./spriteScale";
import { BOSS_TINTS } from "./spriteAssets";

/**
 * Origin tuning. Y > 0.5 pushes the visual upward from the transform point,
 * so 0.88 plants the character's feet near the underlying y, giving sprites
 * of different heights a shared ground line.
 */
const PLAYER_ORIGIN_Y = 0.88;
const ENEMY_ORIGIN_Y = 0.88;

export function createPlayerSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  characterId: string
): Phaser.GameObjects.Sprite {
  const base = `player_${characterId}`;
  const sheetIdle = `${base}_sheet_idle`;
  const animIdle = `${characterId}_idle`;
  const tex = scene.textures.exists(sheetIdle) ? sheetIdle : base;
  const spr = scene.add
    .sprite(x, y, tex)
    .setOrigin(0.5, PLAYER_ORIGIN_Y)
    .setScale(playerDisplayScale(characterId))
    .setDepth(10);
  if (scene.anims.exists(animIdle)) {
    spr.play(animIdle);
  }
  return spr;
}

function enemySheetKey(textureKey: string): string {
  const base =
    textureKey.startsWith("enemy_elite_grade") ? "enemy_elite_grade1" : textureKey;
  return `${base}_sheet`;
}

export function createEnemySprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey: string
): Phaser.GameObjects.Sprite {
  const sheet = enemySheetKey(textureKey);
  const tex = scene.textures.exists(sheet) ? sheet : textureKey;
  const isBoss = textureKey.startsWith("enemy_boss");
  const isElite = textureKey.startsWith("enemy_elite");
  const typeId = textureKey.replace(/^enemy_/, "");
  const spr = scene.add
    .sprite(x, y, tex)
    .setOrigin(0.5, ENEMY_ORIGIN_Y)
    .setScale(enemyDisplayScale(typeId, { boss: isBoss, elite: isElite }))
    .setDepth(5);
  // Tint the shared boss artwork per type so Jogo / Hanami / Mahito read as
  // distinct on screen until we ship dedicated PNGs.
  if (isBoss) {
    const tint = BOSS_TINTS[typeId];
    if (tint !== undefined) spr.setTint(tint);
  }
  return spr;
}

export function createPickupSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  textureKey = "pickup_xp"
): Phaser.GameObjects.Sprite {
  // XP gems get the animated sprite-sheet; everything else uses the static texture.
  if (textureKey === "pickup_xp") {
    const sheet = "pickup_xp_sheet";
    const tex = scene.textures.exists(sheet) ? sheet : "pickup_xp";
    const spr = scene.add
      .sprite(x, y, tex)
      .setOrigin(0.5, 0.5)
      .setScale(pickupDisplayScale())
      .setDepth(3);
    if (scene.anims.exists("pickup_pulse")) {
      spr.play("pickup_pulse");
    }
    return spr;
  }
  const tex = scene.textures.exists(textureKey) ? textureKey : "pickup_xp";
  return scene.add
    .sprite(x, y, tex)
    .setOrigin(0.5, 0.5)
    .setScale(pickupDisplayScale())
    .setDepth(3);
}
