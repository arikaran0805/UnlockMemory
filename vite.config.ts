import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy /piston-api/* → VITE_PISTON_URL/* (avoids CORS — Piston is server-to-server only)
      '/piston-api': {
        target: process.env.VITE_PISTON_URL || 'http://localhost:2000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/piston-api/, ''),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
