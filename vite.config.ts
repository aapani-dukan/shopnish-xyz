// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // If your index.html is in `client/`
  root: './client', // This tells Vite to look for index.html inside the client folder
  // OR if your index.html is in `client/public`
  // root: './client/public', // Adjust this if your index.html is inside a subfolder of client

  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'window',
    'Buffer': ['buffer', 'Buffer'],
  },
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'stream': 'stream-browserify',
      'util': 'util/',
    },
  },
});
