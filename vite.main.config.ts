import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/main',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      name: 'main',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron', 'child_process', 'path', 'fs', 'fs/promises', 'os', 'events', 'stream', 'util', 'url', 'http', 'https', 'readline', 'xlsx', 'crypto', 'zlib', 'constants', 'assert', 'node-unrar-js', 'exceljs'],
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
