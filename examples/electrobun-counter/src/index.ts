import { configure, isTauri } from "webtau";
import { getCounter, increment, decrement, reset } from "./services/backend";
import { registerElectrobunProviderIfAvailable } from "./electrobun-provider";

async function main() {
  const modeEl = document.getElementById("mode")!;
  const valueEl = document.getElementById("value")!;

  if (registerElectrobunProviderIfAvailable()) {
    modeEl.textContent = "Electrobun provider (experimental)";
  } else if (!isTauri()) {
    // Configure for browser mode
    modeEl.textContent = "WASM (web)";
    configure({
      loadWasm: async () => {
        const wasm = await import("./wasm/counter_wasm");
        await wasm.default(); // Initialize WASM module
        wasm.init(); // Initialize counter state
        return wasm;
      },
    });
  } else {
    modeEl.textContent = "Tauri IPC (desktop)";
  }

  // Load initial state
  const view = await getCounter();
  valueEl.textContent = String(view.value);

  // Wire up buttons
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
}

main().catch(console.error);
