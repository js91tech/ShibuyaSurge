/**
 * Shared alpha-key + halo despeckle used by both the in-game Phaser texture
 * bake (`spriteCleanup.ts`) and the React lobby portrait cache
 * (`portraitCache.ts`).
 *
 * Phase 1 — Threshold + edge fade: pixels whose `min(R,G,B)` sits at or above
 * `whiteThreshold` go fully transparent; pixels inside the `edgeBand` just
 * below it fade smoothly. This kills bulk near-white background.
 *
 * Phase 2 — Halo despeckle (NEW): some source sprites (notably `toge.png` and
 * `yuta.png`) have anti-aliased silhouette edges where the white background
 * bleeds into the figure at a `min(R,G,B)` *just* below the threshold (~200).
 * Phase 1 leaves those pixels almost fully opaque, which displays as a
 * visible white halo around the silhouette. To clean them up without eating
 * into legitimate interior whites (Gojo's hair, Toge's scarf, ...) we
 * BFS-flood from every pixel that's already transparent and kill any
 * near-white opaque pixel reachable within `haloMaxDepth` source pixels.
 * Interior whites are safe because they're enclosed by coloured pixels, so
 * the flood is blocked before it can reach them.
 */
export interface AlphaKeyOptions {
  /** Pixels at-or-above this `min(R,G,B)` go fully transparent. */
  whiteThreshold?: number;
  /** Pixels in `[whiteThreshold - edgeBand, whiteThreshold)` fade smoothly. */
  edgeBand?: number;
  /** Halo despeckle: near-white opaque pixels with `min(R,G,B) >= this`
   *  that are reachable from the keyed-out background get killed. */
  haloKillThreshold?: number;
  /** Halo despeckle: maximum BFS depth from any transparent seed pixel.
   *  Set to 0 to skip the halo pass entirely. */
  haloMaxDepth?: number;
}

/**
 * Fill the RGB of every not-fully-opaque pixel inside `[x0, x0+rectW) x
 * [y0, y0+rectH)` with the RGB of its nearest opaque (alpha >= 240)
 * neighbour, leaving the alpha channel untouched.
 *
 * This is the second half of the alpha-key pipeline: `alphaKey` keys the
 * background to alpha=0 *but leaves the original RGB intact*, which is fine
 * for nearest-sampled pixel art but produces a visible white halo when a
 * `drawImage` downscale or a Phaser LINEAR sampler interpolates RGB across
 * the silhouette boundary. Bleeding the character's edge RGB outward
 * eliminates the halo without changing the visible silhouette.
 *
 * Implementation: two-pass L1 (chamfer) distance transform that records, for
 * each cell, the linear pixel index of its nearest opaque seed. Then a
 * single sweep copies seed RGB into every non-seed cell. O(rectW * rectH).
 */
export function fillRGBFromNearestOpaque(
  px: Uint8ClampedArray,
  imgW: number,
  x0: number,
  y0: number,
  rectW: number,
  rectH: number
): void {
  const ALPHA_OPAQUE = 240;
  const INF = rectW + rectH + 8;
  const dist = new Int32Array(rectW * rectH);
  // donor[lj] = global pixel index (y * imgW + x) of the nearest opaque cell.
  // -1 means no opaque cell reachable yet.
  const donor = new Int32Array(rectW * rectH);
  for (let ly = 0; ly < rectH; ly++) {
    for (let lx = 0; lx < rectW; lx++) {
      const lj = ly * rectW + lx;
      const i = ((y0 + ly) * imgW + (x0 + lx)) * 4;
      if (px[i + 3] >= ALPHA_OPAQUE) {
        dist[lj] = 0;
        donor[lj] = (y0 + ly) * imgW + (x0 + lx);
      } else {
        dist[lj] = INF;
        donor[lj] = -1;
      }
    }
  }
  // Forward pass — propagate nearest opaque from west / north.
  for (let ly = 0; ly < rectH; ly++) {
    for (let lx = 0; lx < rectW; lx++) {
      const lj = ly * rectW + lx;
      let best = dist[lj];
      let bestDonor = donor[lj];
      if (lx > 0) {
        const wDist = dist[lj - 1] + 1;
        if (wDist < best) {
          best = wDist;
          bestDonor = donor[lj - 1];
        }
      }
      if (ly > 0) {
        const nDist = dist[lj - rectW] + 1;
        if (nDist < best) {
          best = nDist;
          bestDonor = donor[lj - rectW];
        }
      }
      dist[lj] = best;
      donor[lj] = bestDonor;
    }
  }
  // Backward pass — propagate from east / south.
  for (let ly = rectH - 1; ly >= 0; ly--) {
    for (let lx = rectW - 1; lx >= 0; lx--) {
      const lj = ly * rectW + lx;
      let best = dist[lj];
      let bestDonor = donor[lj];
      if (lx < rectW - 1) {
        const eDist = dist[lj + 1] + 1;
        if (eDist < best) {
          best = eDist;
          bestDonor = donor[lj + 1];
        }
      }
      if (ly < rectH - 1) {
        const sDist = dist[lj + rectW] + 1;
        if (sDist < best) {
          best = sDist;
          bestDonor = donor[lj + rectW];
        }
      }
      dist[lj] = best;
      donor[lj] = bestDonor;
    }
  }
  // Copy donor RGB into every non-seed cell (dist > 0).
  for (let ly = 0; ly < rectH; ly++) {
    for (let lx = 0; lx < rectW; lx++) {
      const lj = ly * rectW + lx;
      if (dist[lj] === 0 || donor[lj] < 0) continue;
      const i = ((y0 + ly) * imgW + (x0 + lx)) * 4;
      const ni = donor[lj] * 4;
      px[i] = px[ni];
      px[i + 1] = px[ni + 1];
      px[i + 2] = px[ni + 2];
    }
  }
}

/**
 * Mutates `px` in place. Caller is responsible for any subsequent bbox /
 * trimming / RGB dilation work — this helper only touches the alpha channel.
 */
export function alphaKey(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  opts: AlphaKeyOptions = {}
): void {
  const wt = opts.whiteThreshold ?? 232;
  const band = opts.edgeBand ?? 28;
  const haloKill = opts.haloKillThreshold ?? 195;
  const haloDepth = opts.haloMaxDepth ?? 6;

  // ── Phase 1: bulk threshold + edge fade ───────────────────────────────────
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0) continue;
    const m = Math.min(px[i], px[i + 1], px[i + 2]);
    if (m >= wt) {
      px[i + 3] = 0;
    } else if (m >= wt - band) {
      px[i + 3] = Math.round(a * (1 - (m - (wt - band)) / band));
    }
  }

  if (haloDepth <= 0) return;

  // ── Phase 2: halo despeckle via depth-limited BFS from transparent seeds ──
  // depth[idx] = 255 unvisited, otherwise BFS distance from nearest seed.
  const depth = new Uint8Array(w * h);
  depth.fill(255);
  // Plain arrays act as a FIFO queue; head index advances instead of shifting
  // so the BFS stays O(w*h) without per-step array copies.
  const qx: number[] = [];
  const qy: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] === 0) {
        depth[y * w + x] = 0;
        qx.push(x);
        qy.push(y);
      }
    }
  }
  let head = 0;
  while (head < qx.length) {
    const x = qx[head];
    const y = qy[head];
    head++;
    const d = depth[y * w + x];
    if (d >= haloDepth) continue;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const f = ny * w + nx;
        if (depth[f] !== 255) continue;
        const ni = f * 4;
        const a = px[ni + 3];
        if (a === 0) {
          // Transparent pixels still propagate the flood so halo pixels
          // adjacent to a "lake" of background several pixels deep also get
          // reached. Distance keeps incrementing so we still bound the reach.
          depth[f] = d + 1;
          qx.push(nx);
          qy.push(ny);
          continue;
        }
        const m = Math.min(px[ni], px[ni + 1], px[ni + 2]);
        if (m < haloKill) continue;
        // Near-white opaque pixel touching background → background bleed,
        // not real silhouette. Kill it and let the flood continue through.
        px[ni + 3] = 0;
        depth[f] = d + 1;
        qx.push(nx);
        qy.push(ny);
      }
    }
  }
}
