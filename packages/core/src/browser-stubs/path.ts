export function join(...args: string[]): string {
  return args.join('/');
}
export function resolve(...args: string[]): string {
  return args.join('/');
}
export function basename(p: string): string {
  return p.split('/').pop() || p;
}
export function dirname(p: string): string {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/');
}
export function extname(p: string): string {
  const match = p.match(/\.([^./]+)$/);
  return match ? `.${match[1]}` : '';
}
export function relative(_from: string, to: string): string {
  return to;
}
export function isAbsolute(_p: string): boolean {
  return false;
}
export default {};
