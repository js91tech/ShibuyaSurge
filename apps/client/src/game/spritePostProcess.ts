import { alphaKey, fillRGBFromNearestOpaque } from "./alphaKey";

/** Alpha-key + RGB bleed-fill on a canvas (kills white halos after compositing). */
export function postProcessCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  if (!w || !h) return;
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  alphaKey(px, w, h);
  fillRGBFromNearestOpaque(px, w, 0, 0, w, h);
  ctx.putImageData(data, 0, 0);
}
