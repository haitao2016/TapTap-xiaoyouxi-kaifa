/**
 * Browser-compatible fs polyfill
 * Provides mock implementations of Node.js fs module for browser environments.
 * Actual file system operations will fail gracefully or use in-memory storage.
 */

// In-memory file system store
const memoryFs = new Map<string, string | Buffer>();
const memoryDirs = new Set<string>(['/']);

export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
  COPYFILE_EXCL: 1,
  COPYFILE_FICLONE: 2,
  COPYFILE_FICLONE_FORCE: 4,
};

// Helper to normalize paths
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '') || '/';
}

// === Synchronous API ===

export function existsSync(path: string): boolean {
  const normalized = normalizePath(path);
  return memoryFs.has(normalized) || memoryDirs.has(normalized);
}

export function readFileSync(path: string, _encoding?: string): string | Buffer {
  const normalized = normalizePath(path);
  const content = memoryFs.get(normalized);
  if (content === undefined) {
    const err = new Error(`ENOENT: no such file or directory, open '${path}'`) as any;
    err.code = 'ENOENT';
    err.path = path;
    throw err;
  }
  return content;
}

export function writeFileSync(path: string, data: string | Buffer, _options?: any): void {
  const normalized = normalizePath(path);
  memoryFs.set(normalized, data);
  // Ensure parent directories exist
  const parts = normalized.split('/');
  for (let i = 1; i < parts.length; i++) {
    memoryDirs.add(parts.slice(0, i + 1).join('/') || '/');
  }
}

export function mkdirSync(path: string, _options?: any): void {
  const normalized = normalizePath(path);
  memoryDirs.add(normalized);
  const parts = normalized.split('/');
  for (let i = 1; i < parts.length; i++) {
    memoryDirs.add(parts.slice(0, i + 1).join('/') || '/');
  }
}

export function mkdirRecursiveSync(path: string): void {
  mkdirSync(path, { recursive: true });
}

export function rmSync(path: string, _options?: any): void {
  const normalized = normalizePath(path);
  memoryFs.delete(normalized);
  memoryDirs.delete(normalized);
}

export function rmdirSync(path: string): void {
  const normalized = normalizePath(path);
  memoryDirs.delete(normalized);
}

export function unlinkSync(path: string): void {
  const normalized = normalizePath(path);
  memoryFs.delete(normalized);
}

export function renameSync(oldPath: string, newPath: string): void {
  const oldNorm = normalizePath(oldPath);
  const newNorm = normalizePath(newPath);
  const content = memoryFs.get(oldNorm);
  if (content !== undefined) {
    memoryFs.set(newNorm, content);
    memoryFs.delete(oldNorm);
  }
}

export function statSync(path: string): any {
  const normalized = normalizePath(path);
  if (memoryFs.has(normalized)) {
    const content = memoryFs.get(normalized)!;
    return {
      isFile: () => true,
      isDirectory: () => false,
      size: typeof content === 'string' ? content.length : content.length,
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    };
  }
  if (memoryDirs.has(normalized)) {
    return {
      isFile: () => false,
      isDirectory: () => true,
      size: 0,
      mtime: new Date(),
      atime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    };
  }
  const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as any;
  err.code = 'ENOENT';
  throw err;
}

export function readdirSync(path: string): string[] {
  const normalized = normalizePath(path);
  const prefix = normalized === '/' ? '/' : normalized + '/';
  const entries = new Set<string>();

  // Check directories
  for (const dir of memoryDirs) {
    if (dir.startsWith(prefix) && dir !== normalized) {
      const relative = dir.slice(prefix.length);
      const firstPart = relative.split('/')[0];
      if (firstPart) entries.add(firstPart);
    }
  }

  // Check files
  for (const file of memoryFs.keys()) {
    if (file.startsWith(prefix)) {
      const relative = file.slice(prefix.length);
      const firstPart = relative.split('/')[0];
      if (firstPart) entries.add(firstPart);
    }
  }

  return Array.from(entries);
}

export function copyFileSync(src: string, dest: string): void {
  const content = readFileSync(src);
  writeFileSync(dest, content);
}

export function appendFileSync(path: string, data: string | Buffer): void {
  const normalized = normalizePath(path);
  const existing = memoryFs.get(normalized);
  if (existing) {
    if (typeof existing === 'string' && typeof data === 'string') {
      memoryFs.set(normalized, existing + data);
    } else {
      const buf1 = Buffer.isBuffer(existing) ? existing : Buffer.from(existing);
      const buf2 = Buffer.isBuffer(data) ? data : Buffer.from(data);
      memoryFs.set(normalized, Buffer.concat([buf1, buf2]));
    }
  } else {
    writeFileSync(path, data);
  }
}

export function watch(path: string, _options?: any, _listener?: any): any {
  return {
    on: (_event: string, _cb: Function) => {},
    close: () => {},
  };
}

export function watchFile(_path: string, _listener: any): any {
  return { on: () => {}, close: () => {} };
}

export function unwatchFile(_path: string, _listener?: any): void {}

export function realpathSync(path: string): string {
  return path;
}

export function accessSync(path: string, _mode?: number): void {
  if (!existsSync(path)) {
    const err = new Error(`ENOENT: no such file or directory, access '${path}'`) as any;
    err.code = 'ENOENT';
    throw err;
  }
}

// === File descriptor API ===

const fdMap = new Map<number, string>();
let nextFd = 100;

export function openSync(path: string, _flags?: string, _mode?: number): number {
  const normalized = normalizePath(path);
  if (!memoryFs.has(normalized)) {
    memoryFs.set(normalized, '');
  }
  const fd = nextFd++;
  fdMap.set(fd, normalized);
  return fd;
}

export function readSync(
  fd: number,
  buffer: Buffer,
  offset: number,
  length: number,
  position: number | null
): number {
  const path = fdMap.get(fd);
  if (!path) {
    const err = new Error('EBADF: bad file descriptor') as any;
    err.code = 'EBADF';
    throw err;
  }
  const content = memoryFs.get(path);
  if (!content) return 0;
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const start = position ?? 0;
  const bytesRead = Math.min(length, buf.length - start);
  buf.copy(buffer, offset, start, start + bytesRead);
  return bytesRead;
}

export function closeSync(fd: number): void {
  fdMap.delete(fd);
}

// === Stream API ===

export function createReadStream(path: string, _options?: any): any {
  const content = readFileSync(path);
  // Simple mock stream
  let pushed = false;
  return {
    on(event: string, cb: Function) {
      if (event === 'data' && !pushed) {
        pushed = true;
        cb(content);
      }
      if (event === 'end') {
        cb();
      }
      return this;
    },
    pipe(dest: any) {
      return dest;
    },
    destroy() {},
  };
}

export function createWriteStream(path: string, _options?: any): any {
  let buffer: string[] = [];
  return {
    write(chunk: any, cb?: Function) {
      buffer.push(chunk.toString());
      if (cb) cb();
      return true;
    },
    end(cb?: Function) {
      writeFileSync(path, buffer.join(''));
      if (cb) cb();
    },
    on(_event: string, _cb: Function) {
      return this;
    },
    once(_event: string, _cb: Function) {
      return this;
    },
  };
}

// === Promises API (fs/promises) ===

export const promises = {
  readFile: async (path: string, encoding?: string): Promise<string | Buffer> => {
    return readFileSync(path, encoding);
  },
  writeFile: async (path: string, data: string | Buffer): Promise<void> => {
    writeFileSync(path, data);
  },
  mkdir: async (path: string, options?: any): Promise<void> => {
    mkdirSync(path, options);
  },
  readdir: async (path: string): Promise<string[]> => {
    return readdirSync(path);
  },
  stat: async (path: string): Promise<any> => {
    return statSync(path);
  },
  unlink: async (path: string): Promise<void> => {
    unlinkSync(path);
  },
  rmdir: async (path: string): Promise<void> => {
    rmdirSync(path);
  },
  rm: async (path: string, options?: any): Promise<void> => {
    rmSync(path, options);
  },
  copyFile: async (src: string, dest: string): Promise<void> => {
    copyFileSync(src, dest);
  },
  rename: async (oldPath: string, newPath: string): Promise<void> => {
    renameSync(oldPath, newPath);
  },
  access: async (path: string, mode?: number): Promise<void> => {
    accessSync(path, mode);
  },
  appendFile: async (path: string, data: string | Buffer): Promise<void> => {
    appendFileSync(path, data);
  },
  realpath: async (path: string): Promise<string> => {
    return realpathSync(path);
  },
};

// === Default export ===

export default {
  constants,
  promises,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  statSync,
  readdirSync,
  copyFileSync,
  appendFileSync,
  createReadStream,
  createWriteStream,
  watch,
  watchFile,
  unwatchFile,
  realpathSync,
  accessSync,
  unlinkSync,
  rmdirSync,
  openSync,
  readSync,
  closeSync,
};
