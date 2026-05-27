import { postProcessCanvas } from "./spritePostProcess";
import { SPRITE_URLS } from "./spriteAssets";

/** Bump when portrait processing changes so stale data URLs are not reused. */
const CACHE_GENERATION = 3;
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

  postProcessCanvas(ctx, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

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

function cacheId(key: string): string {
  return `${key}@g${CACHE_GENERATION}`;
}

function loadPortrait(key: string): string {
  const raw = SPRITE_URLS[key];
  if (!raw) return "";
  const id = cacheId(key);
  const cached = CACHE.get(id);
  if (cached) return cached;
  if (PENDING.has(id)) return raw;
  PENDING.set(
    id,
    cleanPortrait(raw)
      .then((cleaned) => {
        CACHE.set(id, cleaned);
        PENDING.delete(id);
        subscribers.forEach((fn) => fn());
        return cleaned;
      })
      .catch(() => {
        PENDING.delete(id);
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
