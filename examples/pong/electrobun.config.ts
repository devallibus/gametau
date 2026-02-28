export default {
  app: {
    name: "Pong (Electrobun Showcase)",
    identifier: "dev.gametau.pong.showcase",
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
