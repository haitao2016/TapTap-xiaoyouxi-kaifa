const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SIZE = 256;
const primaryColor = { r: 255, g: 107, b: 0 };
const darkBg = { r: 13, g: 13, b: 15 };
const accentColor = { r: 240, g: 240, b: 245 };

function drawRoundedRect(data, x, y, w, h, r, color) {
  const { width } = data;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dx = px - x;
      const dy = py - y;
      const cornerDist = (cx, cy) => Math.sqrt(cx * cx + cy * cy);
      let inRect = true;
      if (dx < r && dy < r) inRect = cornerDist(dx - r + 0.5, dy - r + 0.5) <= r;
      else if (dx > w - r && dy < r) inRect = cornerDist(dx - w + r - 0.5, dy - r + 0.5) <= r;
      else if (dx < r && dy > h - r) inRect = cornerDist(dx - r + 0.5, dy - h + r - 0.5) <= r;
      else if (dx > w - r && dy > h - r) inRect = cornerDist(dx - w + r - 0.5, dy - h + r - 0.5) <= r;
      if (inRect && px >= 0 && px < width && py >= 0 && py < data.height) {
        const idx = (py * width + px) * 4;
        data.data[idx] = color.r;
        data.data[idx + 1] = color.g;
        data.data[idx + 2] = color.b;
        data.data[idx + 3] = 255;
      }
    }
  }
}

function fillCircle(data, cx, cy, radius, color) {
  const { width } = data;
  for (let py = cy - radius; py <= cy + radius; py++) {
    for (let px = cx - radius; px <= cx + radius; px++) {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        if (px >= 0 && px < width && py >= 0 && py < data.height) {
          const idx = (py * width + px) * 4;
          data.data[idx] = color.r;
          data.data[idx + 1] = color.g;
          data.data[idx + 2] = color.b;
          data.data[idx + 3] = 255;
        }
      }
    }
  }
}

const png = new PNG({ width: SIZE, height: SIZE });
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i] = 0;
  png.data[i + 1] = 0;
  png.data[i + 2] = 0;
  png.data[i + 3] = 0;
}

const cx = SIZE / 2, cy = SIZE / 2;
const pad = 24;

drawRoundedRect(png, pad, pad, SIZE - pad * 2, SIZE - pad * 2, 40, darkBg);

drawRoundedRect(png, pad + 16, pad + 16, SIZE - pad * 2 - 32, SIZE - pad * 2 - 32, 28, primaryColor);

fillCircle(png, cx, cy - 12, 50, { r: 255, g: 255, b: 255 });

const triSize = 28;
const triColor = primaryColor;
const triPoints = [
  { x: cx - triSize * 0.7, y: cy - triSize * 0.6 },
  { x: cx + triSize * 0.7, y: cy },
  { x: cx - triSize * 0.7, y: cy + triSize * 0.6 },
];

function fillTriangle(data, p1, p2, p3, color) {
  const minX = Math.max(0, Math.floor(Math.min(p1.x, p2.x, p3.x)));
  const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(p1.x, p2.x, p3.x)));
  const minY = Math.max(0, Math.floor(Math.min(p1.y, p2.y, p3.y)));
  const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(p1.y, p2.y, p3.y)));

  function edge(ax, ay, bx, by, px, py) {
    return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  }

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const e1 = edge(p1.x, p1.y, p2.x, p2.y, px, py);
      const e2 = edge(p2.x, p2.y, p3.x, p3.y, px, py);
      const e3 = edge(p3.x, p3.y, p1.x, p1.y, px, py);
      if ((e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0)) {
        const idx = (py * SIZE + px) * 4;
        data.data[idx] = color.r;
        data.data[idx + 1] = color.g;
        data.data[idx + 2] = color.b;
        data.data[idx + 3] = 255;
      }
    }
  }
}

fillTriangle(png, triPoints[0], triPoints[1], triPoints[2], triColor);

const pngBuffer = PNG.sync.write(png);
const assetsDir = path.join(__dirname, '..', 'apps', 'desktop', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);

function createIco(pngPath, icoPath) {
  const pngData = fs.readFileSync(pngPath);
  const sizes = [256, 64, 48, 32, 16];

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(sizes.length, 4);

  let dirOffset = 6 + sizes.length * 16;
  const dirEntries = [];
  const imageDataList = [];

  for (const size of sizes) {
    const resizedPng = new PNG({ width: size, height: size });
    const resizedData = resizedPng.data;
    const factor = SIZE / size;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcX = Math.floor(x * factor);
        const srcY = Math.floor(y * factor);
        const srcIdx = (srcY * SIZE + srcX) * 4;
        const dstIdx = (y * size + x) * 4;
        resizedData[dstIdx] = png.data[srcIdx];
        resizedData[dstIdx + 1] = png.data[srcIdx + 1];
        resizedData[dstIdx + 2] = png.data[srcIdx + 2];
        resizedData[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }

    const pngBuf = PNG.sync.write(resizedPng);
    imageDataList.push(pngBuf);

    const entry = Buffer.alloc(16);
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuf.length, 8);
    entry.writeUInt32LE(dirOffset, 12);
    dirEntries.push(entry);
    dirOffset += pngBuf.length;
  }

  const buffers = [icoHeader, ...dirEntries, ...imageDataList];
  fs.writeFileSync(icoPath, Buffer.concat(buffers));
  console.log(`ICO created: ${icoPath}`);
}

createIco(
  path.join(assetsDir, 'icon.png'),
  path.join(assetsDir, 'icon.ico')
);

console.log('Icons generated successfully!');
