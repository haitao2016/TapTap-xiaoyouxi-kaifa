/**
 * 浏览器兼容的加密工具函数
 * 提供 Node.js 和浏览器环境通用的加密功能
 */

/**
 * 生成符合 RFC 4122 标准的 UUID v4
 * 在浏览器环境中使用 crypto.randomUUID()（如果可用）
 * 否则回退到基于 Math.random() 的实现
 */
export function generateUUID(): string {
  // 优先使用原生 API
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    return (globalThis as any).crypto.randomUUID();
  }

  // 浏览器回退实现
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    return generateUUIDv4WithCrypto();
  }

  // 纯 Math.random 回退（低安全性但可用）
  return generateUUIDv4WithMath();
}

/**
 * 使用 crypto.getRandomValues 生成 UUID
 */
function generateUUIDv4WithCrypto(): string {
  const arr = new Uint8Array(16);
  (globalThis as any).crypto.getRandomValues(arr);

  // 设置版本号 (4) 和变体 (RFC 4122)
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;

  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 使用 Math.random 生成 UUID（回退方案）
 */
function generateUUIDv4WithMath(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成简短的唯一 ID（8-12字符）
 */
export function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    const arr = new Uint8Array(8);
    (globalThis as any).crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => chars[b % chars.length])
      .join('');
  }

  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * 生成哈希值（简化版，浏览器兼容）
 * 支持链式调用: generateHash('sha256').update(data).digest('hex')
 */
export function generateHash(algorithm: string): Hash {
  return new Hash(algorithm);
}

class Hash {
  private algorithm: string;
  private data: string = '';

  constructor(algorithm: string) {
    this.algorithm = algorithm;
  }

  update(data: string | Buffer): this {
    if (typeof data === 'string') {
      this.data += data;
    } else {
      // 处理 Buffer 类型
      this.data += data.toString('utf-8');
    }
    return this;
  }

  digest(_format?: string): string {
    // 生成简化哈希（浏览器兼容）
    // 注意：这与 Node.js 的 crypto.createHash 不是完全兼容的
    // 对于生产环境，建议使用 Web Crypto API
    return generateSimpleHash(this.data + this.algorithm);
  }
}

/**
 * 简单的字符串哈希函数（用于浏览器兼容）
 */
function generateSimpleHash(input: string): string {
  let hash = 0;
  const str = input + 'tapdev-salt'; // 添加盐值使哈希更分散
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // 转换为 32 字符的十六进制字符串
  let hex = Math.abs(hash).toString(16);
  while (hex.length < 32) {
    // 重复计算使哈希更长
    let temp = 0;
    for (let i = 0; i < hex.length; i++) {
      temp = (temp << 5) - temp + hex.charCodeAt(i);
      temp = temp & temp;
    }
    hex += Math.abs(temp).toString(16);
  }

  return hex.slice(0, 32);
}

// 导出别名，保持与原 API 兼容
export const randomUUID = generateUUID;

// 为了向后兼容，也导出 Node.js 风格的函数
export { generateUUID as uuidv4 };
