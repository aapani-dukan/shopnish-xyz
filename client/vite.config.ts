// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path'; // Import the path module

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'window',
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      // Add your path alias for '@' here
      '@': path.resolve(__dirname, './src'), // Assuming your components/ui are inside client/src
      
      // Keep the Node.js polyfills we added earlier
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'util': 'util/',
    },
  },
});
