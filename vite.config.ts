import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import fs from "fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: "copy-iis-web-config",
        closeBundle() {
          const source = path.resolve(__dirname, "web.config");
          const target = path.resolve(__dirname, "dist", "web.config");
          if (fs.existsSync(source) && fs.existsSync(path.dirname(target))) {
            fs.copyFileSync(source, target);
          }
        },
      },
      // ใช้ visualizer เฉพาะตอน production
      mode === "production" &&
        (visualizer({
          filename: "dist/stats.html",
          open: false,
          gzipSize: true,
        }) as any),
    ].filter(Boolean),
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: true,
      port: 5001,
      strictPort: true,
      hmr:
        process.env.DISABLE_HMR !== "true"
          ? {
              clientPort: 443,
            }
          : false,
      // ลด timeout และเพิ่ม performance
      watch: {
        usePolling: false,
        interval: 100,
      },
    },
    // เพิ่ม build optimization
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["vue", "vue-router"],
            utils: ["axios", "moment", "lucide-vue-next"],
          },
        },
      },
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: true,
        },
      },
      sourcemap: false,
    },
  };
});
