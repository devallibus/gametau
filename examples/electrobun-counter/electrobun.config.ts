export default {
  app: {
    name: "Electrobun Counter (Experimental)",
    identifier: "dev.gametau.electrobun.counter",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      "dist/index.html": "views/main/index.html",
      "dist/assets": "views/main/assets",
    },
  },
};
