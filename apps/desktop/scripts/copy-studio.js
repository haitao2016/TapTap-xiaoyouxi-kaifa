import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const studioDist = join(__dirname, '../../studio/dist');
const target = join(__dirname, '../studio-dist');

if (!existsSync(studioDist)) {
  console.error('Studio dist not found. Run: pnpm --filter @tapdev/studio build');
  process.exit(1);
}

if (existsSync(target)) rmSync(target, { recursive: true });
mkdirSync(target, { recursive: true });
cpSync(studioDist, target, { recursive: true });
console.log('Copied studio dist to apps/desktop/studio-dist');
