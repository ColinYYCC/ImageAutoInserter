import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './',
    root: path.resolve(__dirname, 'src/renderer'),
    publicDir: path.resolve(__dirname, 'public'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    server: {
      port: env.VITE_PORT ? parseInt(env.VITE_PORT, 10) : 5173,
      strictPort: env.VITE_STRICT_PORT === 'true',
    },
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  };
});