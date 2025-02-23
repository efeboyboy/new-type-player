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
    mainFields: ["browser", "module", "main"],
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
      "@magenta/music/es6/core",
      "@magenta/music/es6/music_vae",
      "@magenta/music/es6/music_rnn",
    ],
    esbuildOptions: {
      resolveExtensions: [".js", ".jsx", ".ts", ".tsx"],
      mainFields: ["browser", "module", "main"],
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["tone"],
        },
      },
    },
    chunkSizeWarningLimit: 3000,
  },
});
