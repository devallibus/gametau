import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const defaultProductionBasePath = "/";
const siteBasePath = process.env.SITE_BASE_PATH
  ?? (process.env.NODE_ENV === "production" ? defaultProductionBasePath : "/");

export default defineConfig({
  base: siteBasePath,
  plugins: [tailwindcss()],
});
