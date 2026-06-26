import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: [
        'buffer',
        'crypto',
        'path',
        'stream',
        'util',
        'events',
        'process',
        'string_decoder',
        'assert',
        'zlib',
        'os',
        'url',
        'querystring',
        'punycode',
        'timers',
        'fs',
      ],
      overrides: {
        fs: path.resolve(__dirname, 'src/polyfills/fs.ts'),
      },
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'node:child_process': path.resolve(__dirname, 'src/polyfills/child_process.ts'),
      'child_process': path.resolve(__dirname, 'src/polyfills/child_process.ts'),
      'node:fs/promises': path.resolve(__dirname, 'src/polyfills/fs-promises.ts'),
      'fs/promises': path.resolve(__dirname, 'src/polyfills/fs-promises.ts'),
    },
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
