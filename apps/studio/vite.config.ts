import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const coreDir = path.resolve(__dirname, '../../packages/core/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: 'node:fs', replacement: path.resolve(coreDir, 'browser-stubs/fs.ts') },
      { find: 'node:crypto', replacement: path.resolve(coreDir, 'browser-stubs/node-crypto.ts') },
      { find: 'fs/promises', replacement: path.resolve(coreDir, 'browser-stubs/fs.ts') },
      { find: /^fs$/, replacement: path.resolve(coreDir, 'browser-stubs/fs.ts') },
      { find: /^path$/, replacement: path.resolve(coreDir, 'browser-stubs/path.ts') },
      { find: /^crypto$/, replacement: path.resolve(coreDir, 'browser-stubs/node-crypto.ts') },
      { find: 'child_process', replacement: path.resolve(__dirname, 'src/stubs/child_process.ts') },
    ],
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
