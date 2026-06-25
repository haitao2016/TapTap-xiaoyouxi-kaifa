export function createCRC32(data?: Uint8Array | string): number {
  let crc = 0xffffffff;
  const table = makeCRCTable();

  if (data) {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]!) & 0xff]!;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeCRCTable(): number[] {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
