import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function injectMockElectronAPI() {
  return {
    name: 'inject-mock-electron-api',
    transformIndexHtml(html: string) {
      const mockScript = fs.readFileSync(
        path.resolve(__dirname, 'tests/e2e/mock-electron-api.ts'),
        'utf-8'
      );
      return html.replace(
        '<head>',
        `<head><script type="module">${mockScript}</script>`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), injectMockElectronAPI()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: 5173,
    strictPort: true,
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
});
