import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  // webtauVite() auto-detects the standard layout (src-tauri/wasm,
  // src-tauri/core, etc.) — no config needed for scaffolded projects.
  plugins: [webtauVite()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : { protocol: "ws", host: "localhost", port: 1421 },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
