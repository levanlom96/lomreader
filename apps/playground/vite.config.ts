import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      lomreader: resolve(__dirname, '../../packages/lomreader/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
