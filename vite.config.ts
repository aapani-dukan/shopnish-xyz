// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite को बताएँ कि process.env.NODE_ENV क्या है (Node.js-specific)
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // कुछ लाइब्रेरीज़ 'global' ऑब्जेक्ट की अपेक्षा करती हैं; उन्हें ब्राउज़र में 'window' पर मैप करें
    'global': 'window',
    // 'Buffer' को 'buffer' पैकेज में 'Buffer' क्लास से मैप करें
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      // Node.js के 'buffer' मॉड्यूल को ब्राउज़र पॉलीफ़िल से मैप करें
      'buffer': 'buffer/',
      // Node.js के 'stream' मॉड्यूल को ब्राउज़र पॉलीफ़िल से मैप करें
      'stream': 'stream-browserify',
      // Node.js के 'util' मॉड्यूल को ब्राउज़र पॉलीफ़िल से मैप करें
      'util': 'util/',
      // यदि आपको किसी अन्य Node.js मॉड्यूल के लिए भी ऐसी ही समस्या आती है तो उन्हें यहां जोड़ सकते हैं,
      // जैसे 'crypto' को 'crypto-browserify' से, 'path' को 'path-browserify' से आदि।
    },
  },
});
