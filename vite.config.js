import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
      process: "process/browser",
      util: "util",
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
    include: ["buffer", "process/browser", "@magenta/music"],
  },
  build: {
    rollupOptions: {
      external: ["@magenta/music"],
      output: {
        globals: {
          "@magenta/music": "mm",
        },
        manualChunks: {
          vendor: ["tone"],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    chunkSizeWarningLimit: 3000,
  },
});
