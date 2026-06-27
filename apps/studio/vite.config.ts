import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['crypto', 'path', 'os', 'url', 'events', 'stream', 'http', 'https', 'net', 'tls', 'zlib', 'util', 'buffer', 'process', 'assert', 'async_hooks', 'readline', 'http2', 'dns', 'vm', 'querystring', 'string_decoder', 'punycode', 'tty', 'domain', 'constants', 'sys'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
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
