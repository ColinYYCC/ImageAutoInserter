import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
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
        external: ['electron', 'child_process', 'path', 'fs', 'fs/promises', 'os', 'events', 'stream', 'util', 'url', 'http', 'https', 'readline', 'crypto', 'zlib', 'constants', 'assert', 'electron-store', '7zip-min', 'adm-zip', 'unrar-promise', 'node-unrar-js', 'exceljs'],
      },
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isProduction ? false : true,
    },
    esbuild: isProduction ? {
      drop: ['console', 'debugger'],
    } : undefined,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
