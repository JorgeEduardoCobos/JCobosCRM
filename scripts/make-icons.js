// Generates solid-color rounded PNG icons (192 + 512) for the PWA manifest.
// Pure Node, no dependencies. Produces a flat brand-colored tile so the
// manifest satisfies Chrome/Edge installability requirements; the SVG icon
// carries the actual logo for browsers that support SVG manifests.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public');

const BG = [0x17, 0x3c, 0x3a]; // #173c3a
const ACCENT = [0xd8, 0xf2, 0x76]; // #d8f276

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const radius = Math.round(size * 0.22);
  const cx = size / 2;
  // raw image data with filter byte per row
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    for (let x = 0; x < size; x++) {
      // rounded corners: distance from center of corner squares
      const dx = Math.max(0, Math.abs(x - cx) - (cx - radius));
      const dy = Math.max(0, Math.abs(y - cx) - (cx - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);
      let r, g, b, a;
      if (dist > radius + 1) {
        // fully transparent corner
        r = 0; g = 0; b = 0; a = 0;
      } else if (dist > radius - 1) {
        // anti-alias edge
        const t = Math.max(0, Math.min(1, radius - dist));
        r = Math.round(BG[0] * t);
        g = Math.round(BG[1] * t);
        b = Math.round(BG[2] * t);
        a = Math.round(255 * t);
      } else {
        r = BG[0]; g = BG[1]; b = BG[2]; a = 255;
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  // draw a simple "JC" mark using the accent color as block letters
  const mark = Math.round(size * 0.16);
  const top = Math.round(size * 0.32);
  const bottom = Math.round(size * 0.68);
  const stroke = Math.round(size * 0.052);
  // J: vertical bar left-ish, hook at bottom
  const jx = Math.round(size * 0.40);
  for (let y = top; y <= bottom; y++) {
    for (let x = jx; x < jx + stroke; x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = ACCENT[0]; raw[o + 1] = ACCENT[1]; raw[o + 2] = ACCENT[2]; raw[o + 3] = 255;
    }
  }
  // J hook
  for (let x = jx - mark; x <= jx; x++) {
    for (let y = bottom; y < bottom + stroke; y++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = ACCENT[0]; raw[o + 1] = ACCENT[1]; raw[o + 2] = ACCENT[2]; raw[o + 3] = 255;
    }
  }
  // C: vertical bar right-ish, curve top and bottom
  const cx0 = Math.round(size * 0.54);
  const cx1 = cx0 + mark;
  for (let y = top; y <= bottom; y++) {
    for (let x = cx1; x < cx1 + stroke; x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = ACCENT[0]; raw[o + 1] = ACCENT[1]; raw[o + 2] = ACCENT[2]; raw[o + 3] = 255;
    }
  }
  for (let x = cx0; x <= cx1 + stroke; x++) {
    for (const y of [top, bottom]) {
      for (let dy = 0; dy < stroke; dy++) {
        const yy = y + dy;
        if (x < 0 || x >= size || yy < 0 || yy >= size) continue;
        const o = yy * (size * 4 + 1) + 1 + x * 4;
        raw[o] = ACCENT[0]; raw[o + 1] = ACCENT[1]; raw[o + 2] = ACCENT[2]; raw[o + 3] = 255;
      }
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const png = makePng(size);
  const file = resolve(outDir, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
// apple-touch-icon (180) for iOS home screen
const apple = makePng(180);
writeFileSync(resolve(outDir, 'apple-touch-icon.png'), apple);
console.log(`wrote apple-touch-icon.png (${apple.length} bytes)`);
