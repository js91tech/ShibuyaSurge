import Phaser from "phaser";
import { alphaKey, fillRGBFromNearestOpaque } from "./alphaKey";
import { SPRITE_URLS } from "./spriteAssets";

/**
 * Approximate display height we want each sprite key to occupy in-world (px),
 * before camera zoom. Source PNGs that are taller than this are downscaled
 * *once*, with the canvas 2D pipeline at `imageSmoothingQuality: "high"`, and
 * the result is baked into the Phaser texture. Phaser then samples that
 * already-correct-sized texture with NEAREST, which is dramatically crisper
 * than NEAREST-downsampling a 600px source by 0.3x every frame.
 *
 * We bake at ~2x the on-screen target so retina-density screens still have
 * headroom, and we never *upscale* (sources smaller than the target keep
 * their native resolution).
 */
const BAKE_TARGET_H: Record<string, number> = {
  // Players — bumped from 220 → 288 to give retina screens more headroom
  // for the linear-filtered downscale Phaser does after this bake.
  player_yuji: 288,
  player_megumi: 288,
  player_nobara: 288,
  player_gojo: 288,
  player_maki: 288,
  player_toge: 288,
  player_yuta: 288,
  enemy_flyer: 160,
  enemy_charger: 160,
  enemy_swarm: 120,
  enemy_tank: 200,
  enemy_ranged: 160,
  enemy_exploder: 160,
  enemy_elite_grade1: 232,
  enemy_elite_grade2: 232,
  enemy_elite_grade3: 232,
  enemy_boss_jogo: 380,
  enemy_boss_hanami: 380,
  enemy_boss_mahito: 380,
  enemy_boss_sukuna: 400,
  enemy_boss_geto: 380,
  enemy_boss_toji: 370,
  pickup_xp: 72,
};

/**
 * Source PNGs may have near-white backgrounds and large transparent margins.
 * We key out the background to alpha, then auto-trim to the tight bounding box,
 * and cache the trimmed dimensions so spriteScale can target consistent world sizes.
 */

const TRIMMED_DIMS = new Map<string, { w: number; h: number }>();
const CLEANED_SCENES = new WeakSet<Phaser.Scene>();
// Global guard so the heavy per-pixel trim only runs once per texture across
// all scenes / game instances created during the session.
const CLEANED_KEYS = new Set<string>();

export function getTrimmedDims(key: string): { w: number; h: number } | undefined {
  return TRIMMED_DIMS.get(key);
}

interface CleanOpts {
  /** Pixels at-or-above this RGB value (and not already transparent) become fully transparent */
  whiteThreshold?: number;
  /** Edge softening window — pixels in [threshold-edgeBand, threshold] fade smoothly */
  edgeBand?: number;
  /** Pad around the trimmed bounding box (in px) so anims/squash don't clip */
  pad?: number;
}

function cleanSpriteTexture(
  scene: Phaser.Scene,
  key: string,
  opts: CleanOpts = {}
): void {
  if (CLEANED_KEYS.has(key)) return;
  if (!scene.textures.exists(key)) return;
  const source = scene.textures.get(key).getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
  const w = source.width;
  const h = source.height;
  if (!w || !h) return;

  const pad = opts.pad ?? 2;

  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(source, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  // Phase 1 (threshold + edge fade) and phase 2 (halo despeckle that catches
  // the leftover off-white bleed around Toge / Yuta) both live in the shared
  // `alphaKey` helper so the lobby portrait pipeline gets the exact same
  // treatment as the Phaser texture bake.
  alphaKey(px, w, h, {
    whiteThreshold: opts.whiteThreshold,
    edgeBand: opts.edgeBand,
  });

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3];
      if (a <= 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) {
    TRIMMED_DIMS.set(key, { w, h });
    return;
  }

  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - 1, maxX + pad) - cx + 1;
  const ch = Math.min(h - 1, maxY + pad) - cy + 1;

  // ── Voronoi-style RGB fill across the entire downscale source rect ────
  // Same trick as the lobby portrait pipeline: replace the RGB of every
  // not-fully-opaque pixel inside the source rect with its nearest opaque
  // neighbour's RGB. The high-quality canvas downscale below (and Phaser's
  // LINEAR sampler downstream) interpolate RGB and alpha independently in
  // straight-alpha space, so without this fill the keyed-out background's
  // white RGB bleeds into edge output pixels as a white halo around
  // dark-clad sorcerers like Toge / Yuta. Two-pass L1 distance transform
  // handles thin figures with wide bbox margins in O(rect-area).
  fillRGBFromNearestOpaque(px, w, cx, cy, cw, ch);

  ctx.putImageData(img, 0, 0);

  // Optional high-quality downscale to the per-asset bake target. Only shrinks
  // (never enlarges) — undersized sources keep their native pixels untouched.
  const targetH = BAKE_TARGET_H[key];
  const bakeScale = targetH && ch > targetH ? targetH / ch : 1;
  const outW = Math.max(1, Math.round(cw * bakeScale));
  const outH = Math.max(1, Math.round(ch * bakeScale));

  const trimmed = document.createElement("canvas");
  trimmed.width = outW;
  trimmed.height = outH;
  const tctx = trimmed.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(work, cx, cy, cw, ch, 0, 0, outW, outH);

  scene.textures.remove(key);
  scene.textures.addCanvas(key, trimmed);
  // Per-texture LINEAR sampling — the baked canvas already lives at the
  // ideal display height for retina screens, so smooth interpolation
  // produces dramatically crisper edges than the default NEAREST mode.
  if (scene.textures.exists(key)) {
    scene.textures
      .get(key)
      .setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  TRIMMED_DIMS.set(key, { w: outW, h: outH });
  CLEANED_KEYS.add(key);
}

/** Clean every known sprite key on this scene (idempotent per-scene) */
export function cleanAllSpriteTextures(scene: Phaser.Scene): void {
  if (CLEANED_SCENES.has(scene)) return;
  CLEANED_SCENES.add(scene);

  const seen = new Set<string>();
  for (const key of Object.keys(SPRITE_URLS)) {
    if (seen.has(key)) continue;
    seen.add(key);
    cleanSpriteTexture(scene, key);
  }
}
