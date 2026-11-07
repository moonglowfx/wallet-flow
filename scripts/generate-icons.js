// Generate high-res PNG icons (180x180 for iPhone Apple Touch Icon & 512x512 for PWA)
import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, renderPixel) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const idx = rowStart + 1 + x * 4;
      rawData[idx] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
    }
    return (c ^ -1) >>> 0;
  }
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sdRoundedBox(px, py, cx, cy, bw, bh, r) {
  const qx = Math.abs(px - cx) - bw + r;
  const qy = Math.abs(py - cy) - bh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function renderWalletFlowIcon(x, y, w, h) {
  const u = x / w;
  const v = y / h;
  const t = (u + v) * 0.5;

  // Deep Liquid Glass Dark Violet Base (#140B29 -> #09080E)
  let r = 24 * (1 - t) + 9 * t;
  let g = 12 * (1 - t) + 8 * t;
  let b = 46 * (1 - t) + 16 * t;

  // Ambient Neon Orbs
  const d1 = Math.hypot(u - 0.78, v - 0.22);
  const glow1 = Math.max(0, 1 - d1 * 1.65);
  r += 168 * glow1 * 0.45;
  g += 85 * glow1 * 0.35;
  b += 247 * glow1 * 0.55;

  const d2 = Math.hypot(u - 0.22, v - 0.78);
  const glow2 = Math.max(0, 1 - d2 * 1.65);
  r += 217 * glow2 * 0.4;
  g += 70 * glow2 * 0.25;
  b += 239 * glow2 * 0.45;

  // Inner Liquid Glass Squircle Tile
  const tileDist = sdRoundedBox(u, v, 0.5, 0.5, 0.34, 0.34, 0.16);
  if (tileDist < 0.008) {
    const alpha = Math.max(0, Math.min(1, (0.008 - tileDist) / 0.012));
    const gradR = 147 * (1 - t) + 192 * t;
    const gradG = 51 * (1 - t) + 38 * t;
    const gradB = 234 * (1 - t) + 211 * t;
    r = r * (1 - alpha) + gradR * alpha;
    g = g * (1 - alpha) + gradG * alpha;
    b = b * (1 - alpha) + gradB * alpha;

    // Specular border highlight on squircle
    if (Math.abs(tileDist) < 0.007) {
      const bAlpha = (1 - Math.abs(tileDist) / 0.007) * (0.65 - v * 0.4);
      r += (255 - r) * Math.max(0, bAlpha);
      g += (255 - g) * Math.max(0, bAlpha);
      b += (255 - b) * Math.max(0, bAlpha);
    }
  }

  // White Wallet Icon Symbol in Center
  const bodyDist = sdRoundedBox(u, v, 0.49, 0.52, 0.175, 0.135, 0.035);
  const bodyHollow = sdRoundedBox(u, v, 0.49, 0.52, 0.145, 0.105, 0.02);
  const claspDist = sdRoundedBox(u, v, 0.62, 0.52, 0.055, 0.045, 0.018);
  const topFlap = sdRoundedBox(u, v, 0.47, 0.38, 0.15, 0.025, 0.012);

  const isStroke =
    (bodyDist < 0.004 && bodyHollow > -0.004) ||
    (claspDist < 0.004 && claspDist > -0.024) ||
    topFlap < 0.003;

  if (isStroke) {
    r = 255;
    g = 255;
    b = 255;
  }

  return [r, g, b, 255];
}

fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, renderWalletFlowIcon));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512, renderWalletFlowIcon));
console.log('✅ Iconos generados: public/apple-touch-icon.png (180x180) y public/icon-512.png (512x512)');
