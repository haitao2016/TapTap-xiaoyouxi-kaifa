const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const assetsDir = join(__dirname, '../assets');
const iconPath = join(assetsDir, 'icon.ico');

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

if (!existsSync(iconPath)) {
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  ]);
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  icoHeader.writeUInt8(0, 8);
  icoHeader.writeUInt8(0, 9);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(0, 14);
  icoHeader.writeUInt32LE(22, 18);

  const pixelDataSize = 32 * 32 * 4 + 40;
  const pixelData = Buffer.alloc(pixelDataSize, 0);
  pixelData.writeUInt32LE(40, 0);
  pixelData.writeInt32LE(32, 4);
  pixelData.writeInt32LE(64, 8);
  pixelData.writeUInt16LE(1, 12);
  pixelData.writeUInt16LE(32, 14);
  pixelData.writeUInt32LE(0, 16);
  pixelData.writeUInt32LE(32 * 32 * 4, 20);
  pixelData.writeInt32LE(2835, 24);
  pixelData.writeInt32LE(2835, 28);
  pixelData.writeUInt32LE(0, 32);
  pixelData.writeUInt32LE(0, 36);

  let offset = 40;
  for (let y = 31; y >= 0; y--) {
    for (let x = 0; x < 32; x++) {
      const centerX = 16, centerY = 16, radius = 14;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (dist <= radius) {
        pixelData[offset++] = 255;
        pixelData[offset++] = 140;
        pixelData[offset++] = 0;
        pixelData[offset++] = 255;
      } else {
        pixelData[offset++] = 0;
        pixelData[offset++] = 0;
        pixelData[offset++] = 0;
        pixelData[offset++] = 0;
      }
    }
  }

  const andMaskSize = Math.ceil(32 / 32) * 4 * 32;
  const andMask = Buffer.alloc(andMaskSize, 0);

  const fullIco = Buffer.concat([icoHeader, pixelData, andMask]);
  writeFileSync(iconPath, fullIco);
  console.log('Generated placeholder icon: assets/icon.ico');
}
