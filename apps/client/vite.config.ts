import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Load VITE_* from monorepo root .env
  envDir: path.resolve(__dirname, "../.."),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@jjk/game-core": path.resolve(__dirname, "../../packages/game-core/src/index.ts"),
      "@jjk/shared-protocol": path.resolve(
        __dirname,
        "../../packages/shared-protocol/src/index.ts"
      ),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../.."), path.resolve(__dirname, "../../..")],
    },
    port: 5173,
    proxy: {
      "/.proxy/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/\.proxy/, ""),
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
});
