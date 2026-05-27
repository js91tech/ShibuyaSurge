/**
 * Generates tiny placeholder PNGs for player, enemy, and pickup sprites and
 * writes them into apps/client/assets/. These are committed so Cloudflare
 * (and any other fresh checkout) can build the client without requiring an
 * external `assets/` folder. Replace any PNG at the same path with real art
 * to upgrade the look without touching code.
 *
 * Writes PNGs from raw bytes — no `sharp`, `canvas`, or `pngjs` dependency.
 * CRC32 and zlib are the only non-trivial machinery; zlib ships with Node.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "..", "apps", "client", "assets");

// -- PNG primitives -------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type 6 = RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace
  // Prefix each scanline with filter byte 0 (none), then zlib-deflate.
  const stride = 1 + width * 4;
  const filtered = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    filtered[y * stride] = 0;
    rgba.copy(filtered, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(filtered);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -- Drawing helpers ------------------------------------------------------

function makeCanvas(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) }; // all 0 = transparent
}

function setPx(c, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= c.w || y < 0 || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.data[i] = r;
  c.data[i + 1] = g;
  c.data[i + 2] = b;
  c.data[i + 3] = a;
}

function fillCircle(c, cx, cy, radius, color) {
  const r2 = radius * radius;
  const x0 = Math.floor(cx - radius);
  const x1 = Math.ceil(cx + radius);
  const y0 = Math.floor(cy - radius);
  const y1 = Math.ceil(cy + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(c, x, y, color.r, color.g, color.b, 255);
    }
  }
}

function fillRoundedRect(c, x, y, w, h, radius, color) {
  const r2 = radius * radius;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const left = px < x + radius;
      const right = px >= x + w - radius;
      const top = py < y + radius;
      const bottom = py >= y + h - radius;
      if ((left || right) && (top || bottom)) {
        const ccx = left ? x + radius : x + w - radius - 1;
        const ccy = top ? y + radius : y + h - radius - 1;
        const dx = px - ccx;
        const dy = py - ccy;
        if (dx * dx + dy * dy > r2) continue;
      }
      setPx(c, px, py, color.r, color.g, color.b, 255);
    }
  }
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function darken(c, factor) {
  return {
    r: Math.max(0, Math.round(c.r * factor)),
    g: Math.max(0, Math.round(c.g * factor)),
    b: Math.max(0, Math.round(c.b * factor)),
  };
}

// -- Sprite shapes --------------------------------------------------------

function drawHumanoid(w, h, bodyHex, hairHex) {
  const canvas = makeCanvas(w, h);
  const body = hexToRgb(bodyHex);
  const hair = hexToRgb(hairHex);
  const bodyOutline = darken(body, 0.55);
  const hairOutline = darken(hair, 0.55);

  const headR = Math.max(4, Math.round(w * 0.22));
  const headCx = Math.round(w / 2);
  const headCy = Math.round(h * 0.22);

  const bodyX = Math.round(w * 0.22);
  const bodyW = w - bodyX * 2;
  const bodyY = Math.round(h * 0.36);
  const bodyH = Math.round(h * 0.58);
  const bodyR = Math.max(2, Math.round(bodyW / 4));

  fillRoundedRect(canvas, bodyX - 1, bodyY - 1, bodyW + 2, bodyH + 2, bodyR + 1, bodyOutline);
  fillRoundedRect(canvas, bodyX, bodyY, bodyW, bodyH, bodyR, body);

  fillCircle(canvas, headCx, headCy, headR + 1, hairOutline);
  fillCircle(canvas, headCx, headCy, headR, hair);

  return encodePng(w, h, canvas.data);
}

function drawPickup(w, h, hex) {
  const canvas = makeCanvas(w, h);
  const c = hexToRgb(hex);
  const outline = darken(c, 0.45);
  const inner = {
    r: Math.min(255, c.r + 90),
    g: Math.min(255, c.g + 90),
    b: Math.min(255, c.b + 90),
  };

  // Soft rounded square body (inset 1 px so alpha-key trim has a margin).
  fillRoundedRect(canvas, 1, 1, w - 2, h - 2, 3, outline);
  fillRoundedRect(canvas, 2, 2, w - 4, h - 4, 2, c);

  // Brighter inner pixel block to read as a glowing core.
  const size = Math.max(2, Math.floor(Math.min(w, h) * 0.4));
  const ix = Math.floor((w - size) / 2);
  const iy = Math.floor((h - size) / 2);
  for (let y = iy; y < iy + size; y++) {
    for (let x = ix; x < ix + size; x++) {
      setPx(canvas, x, y, inner.r, inner.g, inner.b, 255);
    }
  }

  return encodePng(w, h, canvas.data);
}

// -- Sprite manifest ------------------------------------------------------

const players = [
  { name: "yuji", body: "#ec4899", hair: "#fb7185" },
  { name: "megumi", body: "#1f2937", hair: "#0f172a" },
  { name: "nobara", body: "#f59e0b", hair: "#92400e" },
  { name: "gojo", body: "#4f46e5", hair: "#f8fafc" },
  { name: "maki", body: "#10b981", hair: "#064e3b" },
  { name: "toge", body: "#a855f7", hair: "#ddd6fe" },
  { name: "yuta", body: "#06b6d4", hair: "#0c0a09" },
];

const enemies = [
  { name: "enemy_flyer", body: "#38bdf8", hair: "#0ea5e9" },
  { name: "enemy_charger", body: "#fb923c", hair: "#c2410c" },
  { name: "enemy_swarm", body: "#86efac", hair: "#16a34a" },
  { name: "enemy_tank", body: "#475569", hair: "#1e293b" },
  { name: "enemy_ranged", body: "#14b8a6", hair: "#0f766e" },
  { name: "enemy_exploder", body: "#ef4444", hair: "#7f1d1d" },
  { name: "enemy_elite", body: "#fb7185", hair: "#9f1239" },
];

fs.mkdirSync(outDir, { recursive: true });

let count = 0;

for (const p of players) {
  fs.writeFileSync(path.join(outDir, `${p.name}.png`), drawHumanoid(64, 96, p.body, p.hair));
  count++;
}

for (const e of enemies) {
  fs.writeFileSync(path.join(outDir, `${e.name}.png`), drawHumanoid(48, 48, e.body, e.hair));
  count++;
}

// Boss is intentionally bigger so the silhouette reads as a heavyweight.
fs.writeFileSync(
  path.join(outDir, "enemy_boss.png"),
  drawHumanoid(96, 96, "#dc2626", "#7f1d1d"),
);
count++;

fs.writeFileSync(path.join(outDir, "pickup_xp.png"), drawPickup(16, 16, "#10b981"));
count++;

console.log(`Wrote ${count} placeholder PNGs to apps/client/assets/`);
