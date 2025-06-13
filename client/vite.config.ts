// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    // Vite will watch files inside client/ (default “.” here - because we are already **inside** client)
    root: './',
    base: isProduction ? '/' : '/',

    plugins: [react()],

    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      global: 'window'
    },

    resolve: {
      alias: {
        '@':       path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '..', 'shared'), // browser-safe shared code
        buffer:    'buffer/',
        stream:    'stream-browserify',
        util:      'util/'
      }
    },

    optimizeDeps: {
      exclude: [
        'express', 'http', 'https', 'path', 'fs', 'events',
        'net', 'crypto', 'querystring', 'url', 'zlib', 'async_hooks'
      ]
    },

    build: {
      // ⬇️  **Key change** — output goes one level up, into root/dist
      outDir: path.resolve(__dirname, '../dist'),
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
