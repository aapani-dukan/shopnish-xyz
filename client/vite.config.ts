// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    root: './',
    base: isProduction ? './' : '/',

    plugins: [react()],

    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      global: 'window'
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '..', 'shared'),
        buffer: 'buffer/',
        stream: 'stream-browserify',
        util: 'util/'
      }
    },

    optimizeDeps: {
      exclude: [
        'express', 'http', 'https', 'path', 'fs', 'events',
        'net', 'crypto', 'querystring', 'url', 'zlib', 'async_hooks'
      ]
    },

    build: {
      outDir: path.resolve(__dirname, '..', 'dist/public'),  // ✅ IMPORTANT FIX
      emptyOutDir: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          manualChunks(id) {
            return id.includes('node_modules') ? 'vendor' : undefined;
          }
        }
      }
    }
  };
});
