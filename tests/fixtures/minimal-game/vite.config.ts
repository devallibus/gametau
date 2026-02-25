import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

export default defineConfig({
  // webtauVite() auto-detects the standard layout — no config needed.
  plugins: [webtauVite()],
});
