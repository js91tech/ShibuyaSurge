import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { RunScene } from "./scenes/RunScene";
import { SoloRunScene } from "./scenes/SoloRunScene";

export function createPhaserGame(
  parent: HTMLElement,
  _mode: "online" | "solo" = "online"
): Phaser.Game {
  const w = parent.clientWidth || window.innerWidth;
  const h = parent.clientHeight || window.innerHeight;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    backgroundColor: "#0a0e1a",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      // Keep the global NEAREST default — pixelArt-mode is what lets the
      // procedural projectile / particle / pickup sprites stay crisp. The
      // higher-quality character / enemy / boss / floor art now opts into
      // LINEAR sampling per-texture inside spriteCleanup + BootScene, so we
      // get the HD smooth-edge win without re-introducing the alpha-key
      // halo that LINEAR-by-default caused on every Phaser texture.
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      powerPreference: "high-performance",
    },
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scene: [BootScene, RunScene, SoloRunScene],
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
  });
}
