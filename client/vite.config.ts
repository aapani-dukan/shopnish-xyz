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
    // ✅ महत्वपूर्ण: Vite का रूट client डायरेक्टरी ही होनी चाहिए
    // यह Vite को बताता है कि वह केवल client/ फोल्डर के अंदर के फ़ाइलों को देखे
    root: './', // यह पहले से ही है, लेकिन सुनिश्चित करें कि यह यहीं है
    base: isProduction ? '/' : '/',
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'global': 'window',
      
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // ✅ यह सुनिश्चित करें कि @shared केवल उन फाइलों को इम्पोर्ट करे जो ब्राउज़र-संगत हैं
        '@shared': path.resolve(__dirname, '..', 'shared'), 
        'buffer': 'buffer/',
        'stream': 'stream-browserify',
        'util': 'util/',
      },
    },
    // ✅ महत्वपूर्ण: Node.js कोर मॉड्यूल को बाहर करें
    optimizeDeps: {
      // Vite को बताएं कि इन मॉड्यूल को क्लाइंट-साइड डिपेंडेंसी के रूप में प्री-बंडल करने की कोशिश न करें
      exclude: [
        'express',
        'http',
        'https',
        'path',
        'fs',
        'events',
        'net',
        'crypto',
        'querystring',
        'url',
        'zlib',
        'async_hooks',
      ],
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        // ✅ महत्वपूर्ण: यहां externals को हटाने का प्रयास करें, क्योंकि वे सर्वर के लिए थे, क्लाइंट के लिए नहीं
        // external: ['express', 'http', 'net', 'path', 'fs', 'events', 'crypto', 'querystring', 'url', 'zlib', 'async_hooks'], // <-- इस लाइन को हटा दें या टिप्पणी करें
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
