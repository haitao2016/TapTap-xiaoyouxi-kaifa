import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electronRenderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    react(),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
