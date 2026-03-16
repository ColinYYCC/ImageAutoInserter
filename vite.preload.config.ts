import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/main',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main/preload.ts'),
      name: 'preload',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
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
