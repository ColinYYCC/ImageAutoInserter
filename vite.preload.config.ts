import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
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
