import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

export default defineConfig({
  plugins: [
    webtauVite({
      wasmCrate: "src-tauri/wasm",
      wasmOutDir: "src/wasm",
      watchPaths: ["src-tauri/core/src"],
    }),
  ],
});
