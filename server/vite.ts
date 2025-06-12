
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  root: './',
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'window',
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '..', 'shared'),
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'util': 'util/',
    },
  },
});
