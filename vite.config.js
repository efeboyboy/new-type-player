import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      process: "process/browser",
      util: "util/",
      stream: "stream-browserify",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
    "process.browser": true,
    "Buffer.isBuffer": "false",
  },
  optimizeDeps: {
    include: [
      "buffer",
      "process/browser",
      "util",
      "stream-browserify",
      "@magenta/music",
    ],
  },
  build: {
    rollupOptions: {
      external: ["stream-browserify", "util", "@magenta/music"],
      output: {
        globals: {
          "stream-browserify": "Stream",
          util: "util",
          "@magenta/music": "mm",
        },
        manualChunks: {
          vendor: [
            "tone",
            "buffer",
            "process/browser",
            "util",
            "stream-browserify",
            "@magenta/music",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
});
