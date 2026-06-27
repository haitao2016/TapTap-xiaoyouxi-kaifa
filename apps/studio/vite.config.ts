import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'path', 'os', 'url', 'events', 'stream', 'http', 'https', 'net', 'tls', 'zlib', 'util', 'buffer', 'process', 'assert', 'async_hooks', 'readline', 'http2', 'dns', 'vm', 'querystring', 'string_decoder', 'punycode', 'tty', 'domain', 'constants', 'sys'],
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
      'fs/promises': path.resolve(__dirname, 'src/mocks/fs-promises.js'),
      'node:fs/promises': path.resolve(__dirname, 'src/mocks/fs-promises.js'),
      'fs': path.resolve(__dirname, 'src/mocks/fs.js'),
      'node:fs': path.resolve(__dirname, 'src/mocks/fs.js'),
      'child_process': path.resolve(__dirname, 'src/mocks/child_process.js'),
      'node:child_process': path.resolve(__dirname, 'src/mocks/child_process.js'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
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
    rollupOptions: {
      external: [
        'raindrop-ai',
        'posthog-node',
        '@posthog/core',
        '@traceloop/node-server-sdk',
        '@opentelemetry/api',
        '@opentelemetry/sdk-node',
        '@opentelemetry/exporter-prometheus',
        '@opentelemetry/otlp-grpc-exporter-base',
        '@opentelemetry/context-async-hooks',
        '@grpc/grpc-js',
        '@grpc/proto-loader',
        'chokidar',
      ],
    },
  },
});
