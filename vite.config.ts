import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEV_HOST = process.env.VITE_DEV_HOST || "0.0.0.0";
const DEV_PORT = Number(process.env.VITE_DEV_PORT || 8080);
const API_PORT = Number(process.env.API_PORT || 3000);
const HMR_HOST = process.env.VITE_HMR_HOST;
const HMR_CLIENT_PORT = Number(process.env.VITE_HMR_CLIENT_PORT || DEV_PORT);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: DEV_HOST,
    port: DEV_PORT,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      protocol: "ws",
      host: HMR_HOST,
      clientPort: HMR_CLIENT_PORT,
      overlay: false,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
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
