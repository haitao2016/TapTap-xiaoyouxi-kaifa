export function createHash(_algorithm: string): {
  update(data: string): void;
  digest(encoding: string): string;
} {
  return {
    update(_data: string) {},
    digest(_encoding: string) {
      return '';
    },
  };
}
export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export default {};
