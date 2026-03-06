import type { ElectrobunConfig } from "electrobun";

const renderMode = process.env.GAMETAU_ELECTROBUN_RENDER_MODE === "gpu"
  ? "gpu"
  : "browser";
const isGpu = renderMode === "gpu";

export default {
  app: {
    name: isGpu ? "Battlestation (GPUWindow)" : "Battlestation (Electrobun Showcase)",
    identifier: "dev.gametau.battlestation.showcase",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: isGpu ? "src/bun/gpu.ts" : "src/bun/browser.ts",
    },
    copy: {
      "dist/index.html": "views/main/index.html",
      "dist/assets": "views/main/assets",
    },
    mac: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
    linux: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
    win: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
  },
} satisfies ElectrobunConfig;
