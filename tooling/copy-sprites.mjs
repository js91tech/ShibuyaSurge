/**
 * Copies generated PNGs from workspace `assets/` into client public for static hosting.
 * Dev uses Vite imports in spriteAssets.ts; run this before deploy if you prefer /public paths.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.resolve(root, "..", "assets");
const dst = path.join(root, "apps/client/public/assets/sprites");

const map = [
  ["yuji.png", "characters/yuji.png"],
  ["megumi.png", "characters/megumi.png"],
  ["nobara.png", "characters/nobara.png"],
  ["gojo.png", "characters/gojo.png"],
  ["enemy_flyer.png", "enemies/flyer.png"],
  ["enemy_charger.png", "enemies/charger.png"],
  ["enemy_swarm.png", "enemies/swarm.png"],
  ["enemy_tank.png", "enemies/tank.png"],
  ["enemy_ranged.png", "enemies/ranged.png"],
  ["enemy_exploder.png", "enemies/exploder.png"],
  ["enemy_elite.png", "enemies/elite.png"],
  ["enemy_boss.png", "enemies/boss.png"],
  ["pickup_xp.png", "pickups/xp.png"],
];

for (const [, sub] of map) {
  fs.mkdirSync(path.dirname(path.join(dst, sub)), { recursive: true });
}

let ok = 0;
for (const [file, sub] of map) {
  const from = path.join(src, file);
  const to = path.join(dst, sub);
  if (!fs.existsSync(from)) {
    console.warn("missing:", from);
    continue;
  }
  fs.copyFileSync(from, to);
  ok++;
}
console.log(`Copied ${ok}/${map.length} sprites to ${dst}`);
