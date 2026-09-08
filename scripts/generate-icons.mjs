// Minimal dependency-free PNG writer + icon rasterizer for the Realtor Suite PWA marks.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const NAVY = hex("#0f172a");
const NAVY_LIFT = hex("#1e293b");
const WHITE = hex("#ffffff");
const MIST = hex("#e2e8f0");
const SKY = hex("#38bdf8");
const SKY_DEEP = hex("#0284c7");

// Point-in-polygon (even-odd), normalized coordinates.
function inPoly(pts, x, y) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// The mark: a gabled roof with real eave overhang over a white block, navy doorway.
const ROOF_Y = 0.455;
const ROOF = [
  [0.5, 0.135],
  [0.905, 0.45],
  [0.905, ROOF_Y + 0.025],
  [0.095, ROOF_Y + 0.025],
  [0.095, 0.45],
];
const BODY = [0.185, ROOF_Y + 0.025, 0.815, 0.855];

function sampleGlyph(x, y, scale) {
  // Scale the glyph about the canvas centre (maskable icons need a safe zone).
  const gx = (x - 0.5) / scale + 0.5;
  const gy = (y - 0.5) / scale + 0.5;

  if (inPoly(ROOF, gx, gy)) {
    const t = Math.min(Math.max((gx - 0.095) / 0.81, 0), 1);
    return mix(SKY, SKY_DEEP, t);
  }

  const [bx0, by0, bx1, by1] = BODY;
  if (gx >= bx0 && gx <= bx1 && gy >= by0 && gy <= by1) {
    // One centred doorway. A second opening turns to mush below 32px.
    if (inRoundRect(gx, gy, 0.44, 0.635, 0.56, by1, 0.06)) return NAVY;
    // A whisper of vertical shading keeps the white from going flat.
    return mix(WHITE, MIST, Math.min(Math.max((gy - by0) / (by1 - by0), 0), 1) * 0.32);
  }
  return null;
}

function render(size, { scale = 1, ss = 4 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const inv = 1 / (ss * ss);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss) / size;
          const y = (py + (sy + 0.5) / ss) / size;
          // Ground: navy, lifted toward the bottom-right with a soft top-left glow.
          let c = mix(NAVY, NAVY_LIFT, Math.min(Math.max((x * 0.35 + y * 0.65), 0), 1));
          const dx = x - 0.28;
          const dy = y - 0.2;
          const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.62);
          c = mix(c, SKY, glow * glow * 0.14);
          const glyph = sampleGlyph(x, y, scale);
          if (glyph) c = glyph;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const i = (py * size + px) * 4;
      buf[i] = Math.round(r * inv);
      buf[i + 1] = Math.round(g * inv);
      buf[i + 2] = Math.round(b * inv);
      buf[i + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

const root = process.argv[2];
const targets = [
  ["app/icon.png", 512, 1],
  ["app/apple-icon.png", 180, 1],
  ["public/icons/icon-192.png", 192, 1],
  ["public/icons/icon-512.png", 512, 1],
  ["public/icons/icon-maskable-512.png", 512, 0.68],
];

for (const [rel, size, scale] of targets) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const png = render(size, { scale });
  fs.writeFileSync(out, png);
  console.log(`${rel.padEnd(34)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
