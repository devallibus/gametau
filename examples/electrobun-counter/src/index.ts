import { configure, isTauri } from "webtau";
import {
  bootstrapElectrobunFromWindowBridge,
  getElectrobunCapabilities,
} from "webtau/adapters/electrobun";
import { setupElectrobunHybridWgpu } from "./hybrid-wgpu";
import { getCounter, increment, decrement, reset } from "./services/backend";

async function main() {
  const modeEl = document.getElementById("mode")!;
  const valueEl = document.getElementById("value")!;
  let hybridHandle: ReturnType<typeof setupElectrobunHybridWgpu> | null = null;

  if (bootstrapElectrobunFromWindowBridge()) {
    const capabilities = getElectrobunCapabilities();
    hybridHandle = setupElectrobunHybridWgpu();
    const renderMode = hybridHandle?.renderMode ?? capabilities?.renderMode ?? "browser";
    modeEl.textContent = `Electrobun bridge (${renderMode})`;
  } else if (!isTauri()) {
    modeEl.textContent = "WASM (web)";
    configure({
      loadWasm: async () => {
        const wasm = await import("./wasm/counter_wasm");
        await wasm.default();
        wasm.init();
        return wasm;
      },
    });
  } else {
    modeEl.textContent = "Tauri IPC (desktop)";
  }

  const view = await getCounter();
  valueEl.textContent = String(view.value);

  document.getElementById("inc")!.addEventListener("click", async () => {
    const result = await increment();
    valueEl.textContent = String(result.value);
  });

  document.getElementById("dec")!.addEventListener("click", async () => {
    const result = await decrement();
    valueEl.textContent = String(result.value);
  });

  document.getElementById("reset")!.addEventListener("click", async () => {
    const result = await reset();
    valueEl.textContent = String(result.value);
  });

  window.addEventListener("beforeunload", () => {
    hybridHandle?.destroy();
  });
}

main().catch(console.error);
