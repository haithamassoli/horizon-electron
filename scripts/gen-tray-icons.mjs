// Build 4 tray icon PNGs: active/paused × light/dark backgrounds.
// Pure Node; no native deps. Output: resources/tray/*.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'resources', 'tray');
mkdirSync(OUT_DIR, { recursive: true });

const SIZE = 32;

/** @returns {Uint8Array} length SIZE*SIZE*4, RGBA premultiplied off */
function render({ paused, glyphRGBA }) {
  const px = new Uint8Array(SIZE * SIZE * 4);
  const cx = (SIZE - 1) / 2;
  const cy = (SIZE - 1) / 2;
  const outerR = 13.5;
  const ringInner = 11;
  const dotR = 3.6;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);

      // Soft outer ring
      let alpha = 0;
      const ringEdge = smoothBand(d, ringInner, outerR);
      alpha = Math.max(alpha, ringEdge * 0.85);

      if (paused) {
        // Two vertical bars (pause glyph)
        const barW = 2.2;
        const barH = 7.5;
        const barOff = 3.2;
        const inBarL = Math.abs(dx + barOff) <= barW / 2 && Math.abs(dy) <= barH / 2;
        const inBarR = Math.abs(dx - barOff) <= barW / 2 && Math.abs(dy) <= barH / 2;
        if (inBarL || inBarR) alpha = Math.max(alpha, 1);
      } else {
        // Center filled disc (active)
        const dotEdge = smoothCircle(d, dotR);
        alpha = Math.max(alpha, dotEdge);
      }

      // Anti-alias edge of outer ring outer boundary
      if (d > outerR) {
        const fade = 1 - smoothstep(outerR, outerR + 0.6, d);
        alpha *= fade;
      }

      const i = (y * SIZE + x) * 4;
      px[i] = glyphRGBA[0];
      px[i + 1] = glyphRGBA[1];
      px[i + 2] = glyphRGBA[2];
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

function smoothCircle(d, r) {
  if (d <= r - 0.5) return 1;
  if (d >= r + 0.5) return 0;
  return 1 - (d - (r - 0.5));
}

function smoothBand(d, innerR, outerR) {
  // 1 inside band, fading at edges
  const innerFade = smoothstep(innerR - 0.5, innerR + 0.5, d);
  const outerFade = 1 - smoothstep(outerR - 0.5, outerR + 0.5, d);
  return Math.max(0, Math.min(1, innerFade * outerFade));
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// --- PNG encoder ---

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buf) {
  let table = crc32._table;
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    crc32._table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.subarray(y * stride, (y + 1) * stride).copy?.(raw, y * (stride + 1) + 1) ??
      Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const DARK_GLYPH = [38, 47, 64]; // foreground on light tray
const LIGHT_GLYPH = [232, 238, 246]; // foreground on dark tray

const VARIANTS = [
  { name: 'active-light.png', paused: false, glyph: DARK_GLYPH },
  { name: 'active-dark.png', paused: false, glyph: LIGHT_GLYPH },
  { name: 'paused-light.png', paused: true, glyph: DARK_GLYPH },
  { name: 'paused-dark.png', paused: true, glyph: LIGHT_GLYPH }
];

for (const v of VARIANTS) {
  const rgba = render({ paused: v.paused, glyphRGBA: v.glyph });
  const png = encodePng(rgba, SIZE, SIZE);
  writeFileSync(join(OUT_DIR, v.name), png);
  console.log(`  ${v.name}  ${png.length}B`);
}

console.log(`done → ${OUT_DIR}`);
