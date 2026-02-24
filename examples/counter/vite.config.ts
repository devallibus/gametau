import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    webtauVite({
      wasmCrate: "src-tauri/wasm",
      wasmOutDir: "src/wasm",
      watchPaths: ["src-tauri/core/src"],
    }),
  ],
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
