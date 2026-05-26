import { alphaKey, fillRGBFromNearestOpaque } from "./alphaKey";
import { SPRITE_URLS } from "./spriteAssets";

const CACHE = new Map<string, string>();
const PENDING = new Map<string, Promise<string>>();
const subscribers = new Set<() => void>();

async function cleanPortrait(url: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return url;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Same threshold + halo despeckle the in-game Phaser bake uses
  // (`spriteCleanup.ts`). Toge / Yuta source PNGs have anti-aliased silhouette
  // edges that sit just under the 232 threshold and would otherwise leave a
  // visible white box around the lobby card. The shared helper kills those
  // halo pixels by BFS-flooding from the keyed-out background.
  alphaKey(px, w, h);

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

  if (maxX < 0) return url;

  const pad = 2;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - 1, maxX + pad) - cx + 1;
  const ch = Math.min(h - 1, maxY + pad) - cy + 1;

  // ── Voronoi-style RGB fill across the entire downscale source rect ────
  // Source PNGs have a near-pure-white background that `alphaKey` keys to
  // alpha=0 — but it leaves the RGB channels untouched. Canvas2D's
  // `drawImage` with `imageSmoothingEnabled: true` interpolates RGB and
  // alpha independently (straight-alpha, not premultiplied) and its
  // resampling kernel reaches several source pixels into the keyed-out
  // region, so the otherwise-invisible white RGB gets blended into edge
  // output pixels as a clearly visible light-grey halo around dark-clad
  // sorcerers (Toge / Yuta).
  //
  // Fix: before the downscale, replace the RGB of every not-fully-opaque
  // pixel inside the source rect with the RGB of its nearest opaque
  // neighbour (computed via a two-pass L1 distance transform — O(N), much
  // cheaper than a per-pixel BFS that has to fan out 100+ steps for thin
  // figures). Alpha is untouched so the silhouette is unchanged; we just
  // make sure the colour the keyed-out region carries through the
  // resampler is "character edge colour" instead of "white".
  fillRGBFromNearestOpaque(px, w, cx, cy, cw, ch);

  ctx.putImageData(data, 0, 0);

  // Bake to a fixed display-friendly size with a single high-quality
  // downscale here, so the lobby `<img>` never has to re-resample. Anything
  // larger than the trimmed source stays at its native resolution.
  const TARGET_H = 256;
  const scale = ch > TARGET_H ? TARGET_H / ch : 1;
  const outW = Math.round(cw * scale);
  const outH = Math.round(ch * scale);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d");
  if (!octx) return url;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, outW, outH);

  return out.toDataURL("image/png");
}

function loadPortrait(key: string): string {
  const raw = SPRITE_URLS[key];
  if (!raw) return "";
  const cached = CACHE.get(key);
  if (cached) return cached;
  if (PENDING.has(key)) return raw;

  PENDING.set(
    key,
    cleanPortrait(raw)
      .then((cleaned) => {
        CACHE.set(key, cleaned);
        PENDING.delete(key);
        subscribers.forEach((fn) => fn());
        return cleaned;
      })
      .catch(() => {
        PENDING.delete(key);
        return raw;
      })
  );
  return raw;
}

export function getPortrait(key: string): string {
  return loadPortrait(key);
}

export function subscribePortraits(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
