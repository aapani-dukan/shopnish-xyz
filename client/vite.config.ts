// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { fileURLToPath } from 'url'; // ✅ यह इम्पोर्ट जोड़ें

const __filename = fileURLToPath(import.meta.url); // ✅ यह लाइन जोड़ें
const __dirname = path.dirname(__filename); // ✅ यह लाइन जोड़ें

export default defineConfig(({ command }) => { // ✅ यहां 'command' पैरामीटर जोड़ें
  const isProduction = command === 'build'; // ✅ यह लाइन जोड़ें

  return {
    root: './',
    // ✅ यह महत्वपूर्ण लाइन जोड़ें: 'base' प्रॉपर्टी
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
    // ✅ यह 'build' ऑब्जेक्ट जोड़ें/अपडेट करें
    build: {
      outDir: path.resolve(__dirname, 'dist'), // सुनिश्चित करें कि client/dist में बिल्ड हो
      emptyOutDir: true, // हर बार बिल्ड पर dist फोल्डर को साफ करें
      sourcemap: true, // डिबगिंग के लिए मददगार (वैकल्पिक, लेकिन अच्छा है)
    },
  };
});
