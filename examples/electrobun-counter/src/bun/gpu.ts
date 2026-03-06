import { configure } from "webtau";
import { GpuWindow } from "electrobun/bun";
import { getCounter, increment } from "../services/backend";

async function loadRuntime() {
  configure({
    loadWasm: async () => {
      const wasm = await import("../wasm/counter_wasm");
      await wasm.default();
      wasm.init();
      return wasm;
    },
  });
}

async function main() {
  await loadRuntime();

  const win = new GpuWindow({
    title: "gametau electrobun counter gpu",
    frame: { x: 140, y: 120, width: 960, height: 640 },
    titleBarStyle: "default",
    transparent: false,
  });

  async function syncTitle() {
    const view = await getCounter();
    win.setTitle(`gametau electrobun counter gpu value ${view.value}`);
  }

  await syncTitle();

  setInterval(() => {
    void increment()
      .then(syncTitle)
      .catch(console.error);
  }, 500);
}

main().catch(console.error);
