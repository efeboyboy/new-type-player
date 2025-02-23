import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      process: "process/browser",
      buffer: "buffer",
      util: "util",
      stream: "stream-browserify",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
    "process.hrtime": "(() => [0, 0])",
    "process.browser": true,
    "Buffer.isBuffer": "(() => false)",
  },
  optimizeDeps: {
    include: ["buffer", "process/browser", "util", "stream-browserify"],
  },
});
