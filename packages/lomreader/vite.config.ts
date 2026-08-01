import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Lomreader',
      formats: ['es'],
      fileName: 'lomreader',
    },
    sourcemap: true,
    rollupOptions: {
      external: ['@xmldom/xmldom', 'fflate'],
    },
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: true,
    }),
  ],
});
