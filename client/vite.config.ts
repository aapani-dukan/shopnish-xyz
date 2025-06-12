// your-repo-root/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  // 'root' प्रॉपर्टी की अब आवश्यकता नहीं है, क्योंकि vite.config.ts स्वयं 'client/' में है।
  // Vite स्वतः ही 'client/' को अपना रूट मान लेगा।

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'window',
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      // '@' अब client/src/ को इंगित करेगा, क्योंकि __dirname अब client/ है।
      '@': path.resolve(__dirname, './src'),

      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'util': 'util/',
    },
  },
});
