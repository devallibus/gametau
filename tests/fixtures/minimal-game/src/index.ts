import { configure, invoke, isTauri } from "webtau";

async function main() {
  if (!isTauri()) {
    configure({
      loadWasm: async () => {
        const wasm = await import("./wasm/minimal_wasm");
        await wasm.default();
        wasm.init();
        return wasm;
      },
    });
  }

  const result = await invoke<{ message: string }>("ping");
  document.getElementById("app")!.textContent = result.message;
}

main().catch(console.error);
