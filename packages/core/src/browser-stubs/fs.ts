export function existsSync(_path: string): boolean {
  return false;
}
export function readFileSync(_path: string, _encoding?: string): string {
  return '';
}
export function writeFileSync(_path: string, _data: string | Uint8Array, _encoding?: string): void {}
export function mkdirSync(_path: string, _options?: unknown): void {}
export function readdirSync(_path: string): string[] {
  return [];
}
export function statSync(_path: string): { isFile(): boolean; isDirectory(): boolean } {
  return { isFile: () => false, isDirectory: () => false };
}
export function rmSync(_path: string, _options?: unknown): void {}
export function unlinkSync(_path: string): void {}
export function appendFileSync(_path: string, _data: string | Uint8Array, _encoding?: string): void {}
export function renameSync(_oldPath: string, _newPath: string): void {}
export function copyFileSync(_src: string, _dest: string): void {}
export function chmodSync(_path: string, _mode: unknown): void {}
export function lstatSync(_path: string): { isFile(): boolean; isDirectory(): boolean } {
  return { isFile: () => false, isDirectory: () => false };
}
export function realpathSync(_path: string): string {
  return _path;
}
export function exists(_path: string): Promise<boolean> {
  return Promise.resolve(false);
}
export function readFile(_path: string, _encoding?: string): Promise<string> {
  return Promise.resolve('');
}
export function writeFile(_path: string, _data: string | Uint8Array, _encoding?: string): Promise<void> {
  return Promise.resolve();
}
export function mkdir(_path: string, _options?: unknown): Promise<void> {
  return Promise.resolve();
}
export function readdir(_path: string): Promise<string[]> {
  return Promise.resolve([]);
}
export function stat(_path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }> {
  return Promise.resolve({ isFile: () => false, isDirectory: () => false });
}
export function rm(_path: string, _options?: unknown): Promise<void> {
  return Promise.resolve();
}
export function unlink(_path: string): Promise<void> {
  return Promise.resolve();
}
export function appendFile(_path: string, _data: string | Uint8Array, _encoding?: string): Promise<void> {
  return Promise.resolve();
}
export function rename(_oldPath: string, _newPath: string): Promise<void> {
  return Promise.resolve();
}
export function copyFile(_src: string, _dest: string): Promise<void> {
  return Promise.resolve();
}
export function chmod(_path: string, _mode: unknown): Promise<void> {
  return Promise.resolve();
}
export function lstat(_path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }> {
  return Promise.resolve({ isFile: () => false, isDirectory: () => false });
}
export function realpath(_path: string): Promise<string> {
  return Promise.resolve(_path);
}
export const promises = {
  readFile,
  writeFile,
  mkdir,
  readdir,
  stat,
  rm,
  unlink,
  appendFile,
  rename,
  copyFile,
  chmod,
  lstat,
  realpath,
};
export default {};
