import { configure, isTauri } from "webtau";
import { getWorldView, tickWorld } from "./services/backend";
import { startGameLoop } from "./game/loop";
import { initScene, updateScene } from "./game/scene";

async function main() {
  // Configure webtau for web mode (no-op in Tauri)
  if (!isTauri()) {
    configure({
      loadWasm: async () => {
        const wasm = await import("./wasm/{{PROJECT_NAME}}_wasm");
        await wasm.default(); // Initialize WASM
        wasm.init(42); // Initialize game state
        return wasm;
      },
    });
  }

  // Set up the renderer
  const app = document.getElementById("app")!;
  await initScene(app);

  // Get initial state
  const view = await getWorldView();
  document.getElementById("score")!.textContent = String(view.score);
  document.getElementById("tick")!.textContent = String(view.tick_count);

  // Start game loop
  let tickAccumulator = 0;
  let tickInFlight = false;
  const TICK_RATE = 1 / 10; // 10 ticks per second

  startGameLoop(
    (dt) => {
      tickAccumulator += dt;
      if (!tickInFlight && tickAccumulator >= TICK_RATE) {
        tickAccumulator -= TICK_RATE;
        tickInFlight = true;
        tickWorld()
          .then(() => getWorldView())
          .then((view) => {
            document.getElementById("score")!.textContent = String(view.score);
            document.getElementById("tick")!.textContent = String(view.tick_count);
          })
          .catch(console.error)
          .finally(() => { tickInFlight = false; });
      }
    },
    () => {
      updateScene();
    },
  );
}

main().catch(console.error);
