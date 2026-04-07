import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
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
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
  },
  renderer: {
    plugins: [react()],
    root: path.resolve(__dirname, 'src/renderer'),
    base: './',
    publicDir: path.resolve(__dirname, 'public'),
    server: {
      port: 5173,
      strictPort: true,
    },
    define: {
      __dirname: JSON.stringify(''),
      __filename: JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});