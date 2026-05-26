import Phaser from "phaser";

/**
 * Lightweight sprite pool keyed by texture key. Sprites are not destroyed when
 * released — instead they're hidden/deactivated and reused on the next acquire.
 * Cuts allocations in long survival runs where enemies/pickups churn constantly.
 */
export class SpritePool {
  private pools = new Map<string, Phaser.GameObjects.Sprite[]>();

  constructor(
    private scene: Phaser.Scene,
    private factory: (scene: Phaser.Scene, x: number, y: number, key: string) => Phaser.GameObjects.Sprite
  ) {}

  acquire(textureKey: string, x: number, y: number): Phaser.GameObjects.Sprite {
    const bucket = this.pools.get(textureKey);
    const spr = bucket?.pop();
    if (spr) {
      // Scale is intentionally NOT reset — the factory baked the correct
      // scale per-texture-key on first create, and same key always means
      // same scale. Resetting to 1 produced a one-frame "huge sprite" pop
      // when an enemy was recycled.
      spr.setActive(true)
        .setVisible(true)
        .setPosition(x, y)
        .setAlpha(1)
        .setAngle(0)
        .clearTint();
      return spr;
    }
    return this.factory(this.scene, x, y, textureKey);
  }

  release(textureKey: string, spr: Phaser.GameObjects.Sprite) {
    spr.setActive(false).setVisible(false);
    spr.anims?.stop();
    let bucket = this.pools.get(textureKey);
    if (!bucket) {
      bucket = [];
      this.pools.set(textureKey, bucket);
    }
    // Cap pool size so really long sessions don't hoard memory
    if (bucket.length < 64) {
      bucket.push(spr);
    } else {
      spr.destroy();
    }
  }

  drain() {
    for (const bucket of this.pools.values()) {
      for (const s of bucket) s.destroy();
    }
    this.pools.clear();
  }
}
