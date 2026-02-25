import { configure, isTauri } from "webtau";
import { createScene } from "./game/scene";

async function main() {
  const modeEl = document.getElementById("mode")!;
  const gameEl = document.getElementById("game")!;

  if (!isTauri()) {
    modeEl.textContent = "WASM (web)";
    configure({
      loadWasm: async () => {
        const wasm = await import("./wasm/pong_wasm");
        await wasm.default();
        wasm.init();
        return wasm;
      },
    });
  } else {
    modeEl.textContent = "Tauri IPC (desktop)";
  }

  await createScene(gameEl);
}

main().catch(console.error);
