/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
  plugins: [vue()],
  server: {
    hmr: {
      host: process.env.VITE_TUNNEL_URL || "localhost",
      clientPort: 443,
      protocol: "wss",
    },
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // @ts-ignore
    environmentMatchGlobs: [["tests/unit/authStore.test.ts", "jsdom"]],
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["server/routes/**", "src/store/**"],
    },
  },
});
