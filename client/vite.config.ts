// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
    root: './',
    // ✅ सुनिश्चित करें कि 'base' सही से सेट है
    base: isProduction ? '/' : '/', // उत्पादन में भी रूट पाथ से एसेट्स लोड करें
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
    build: {
      outDir: path.resolve(__dirname, 'dist'), // सुनिश्चित करें कि client/dist में बिल्ड हो
      emptyOutDir: true, // हर बार बिल्ड पर dist फोल्डर को साफ करें
      sourcemap: true, // डिबगिंग के लिए मददगार
      // ✅ यह भाग जोड़ा जा सकता है यदि आपके पास बहुत बड़ा JS बंडल है
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor'; // सभी node_modules को एक अलग चंक में डालें
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000, // चेतावनी सीमा को बढ़ाएँ (KB में)
    },
  };
});
