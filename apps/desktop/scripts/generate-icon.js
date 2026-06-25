const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const assetsDir = join(__dirname, '../assets');
const iconPath = join(assetsDir, 'icon.ico');

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

if (!existsSync(iconPath)) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = [];

  for (const size of sizes) {
    const bpp = 32;
    const rowSize = Math.ceil((size * bpp / 8) / 4) * 4;
    const pixelDataSize = rowSize * size;
    const andMaskRowSize = Math.ceil(size / 8 / 4) * 4;
    const andMaskSize = andMaskRowSize * size;
    const dibSize = 40 + pixelDataSize + andMaskSize;

    const dib = Buffer.alloc(dibSize, 0);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(size, 4);
    dib.writeInt32LE(size * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(bpp, 14);
    dib.writeUInt32LE(0, 16);
    dib.writeUInt32LE(pixelDataSize, 20);
    dib.writeInt32LE(2835, 24);
    dib.writeInt32LE(2835, 28);
    dib.writeUInt32LE(0, 32);
    dib.writeUInt32LE(0, 36);

    let offset = 40;
    const center = size / 2;
    const radius = size * 0.45;
    for (let y = size - 1; y >= 0; y--) {
      for (let x = 0; x < size; x++) {
        const dist = Math.sqrt((x - center + 0.5) ** 2 + (y - center + 0.5) ** 2);
        if (dist <= radius) {
          dib[offset++] = 255;
          dib[offset++] = 140;
          dib[offset++] = 0;
          dib[offset++] = 255;
        } else {
          dib[offset++] = 0;
          dib[offset++] = 0;
          dib[offset++] = 0;
          dib[offset++] = 0;
        }
      }
      offset += rowSize - size * 4;
    }

    images.push({ size, dib, dibSize });
  }

  let totalSize = 6 + 16 * images.length;
  for (const img of images) {
    totalSize += img.dibSize;
  }

  const iconBuffer = Buffer.alloc(totalSize);
  iconBuffer.writeUInt16LE(0, 0);
  iconBuffer.writeUInt16LE(1, 2);
  iconBuffer.writeUInt16LE(images.length, 4);

  let offset = 6;
  let dataOffset = 6 + 16 * images.length;

  for (const img of images) {
    const w = img.size >= 256 ? 0 : img.size;
    const h = img.size >= 256 ? 0 : img.size;
    iconBuffer.writeUInt8(w, offset);
    iconBuffer.writeUInt8(h, offset + 1);
    iconBuffer.writeUInt8(0, offset + 2);
    iconBuffer.writeUInt8(0, offset + 3);
    iconBuffer.writeUInt16LE(1, offset + 4);
    iconBuffer.writeUInt16LE(32, offset + 6);
    iconBuffer.writeUInt32LE(img.dibSize, offset + 8);
    iconBuffer.writeUInt32LE(dataOffset, offset + 12);
    offset += 16;
    img.dib.copy(iconBuffer, dataOffset);
    dataOffset += img.dibSize;
  }

  writeFileSync(iconPath, iconBuffer);
  console.log('Generated icon with sizes:', sizes.join(', '));
}
