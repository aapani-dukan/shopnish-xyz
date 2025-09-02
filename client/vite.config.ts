import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  server: {
    port: 5173, // आप चाहें तो बदल सकते हैं
    proxy: {
      "/api": {
        target: "http://localhost:5000", // backend express server
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:5000", // socket.io backend
        ws: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
});
