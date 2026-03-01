export default {
  app: {
    name: "Counter (Electrobun Showcase)",
    identifier: "dev.gametau.counter.showcase",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.js",
    },
    copy: {
      "dist/index.html": "views/main/index.html",
      "dist/assets": "views/main/assets",
    },
  },
};
