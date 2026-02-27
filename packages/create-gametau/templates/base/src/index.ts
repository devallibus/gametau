import { configure, isTauri } from "webtau";
import { startGameLoop } from "./game/loop";
import { initScene, updateScene } from "./game/scene";
import {
  createServiceLayer,
  getWorldView,
  tickWorld,
  type AlertLevel,
  type RuntimeSettings,
  type WorldView,
} from "./services";

function resolveAlertLevel(scoreDelta: number): AlertLevel {
  if (scoreDelta >= 2) return "critical";
  if (scoreDelta > 0) return "info";
  return "warning";
}

function updateHud(view: WorldView, settings: RuntimeSettings): void {
  document.getElementById("score")!.textContent = String(view.score);
  document.getElementById("tick")!.textContent = String(view.tick_count);
  document.getElementById("tick-rate")!.textContent = String(settings.tickRateHz);
  document.getElementById("autosave")!.textContent = String(settings.autoSaveEveryTicks);
}

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

  // Build service seams up front: backend invoke wrappers + fs/path + event orchestration.
  const services = await createServiceLayer();
  const settings = await services.settings.load();
  const previousSession = await services.session.loadLastSnapshot();
  document.getElementById("session")!.textContent = previousSession
    ? `restored (${previousSession.savedAt})`
    : "fresh";
  document.getElementById("alert")!.textContent = "ready";

  const unlistenAlerts = await services.comms.subscribe((message) => {
    document.getElementById("alert")!.textContent = `[${message.level}] ${message.message}`;
  });
  window.addEventListener("beforeunload", () => {
    unlistenAlerts();
  });

  // Persist settings on first run so users have an explicit config seam to extend.
  await services.settings.save(settings);

  // Get and display initial state.
  const view = await getWorldView();
  updateHud(view, settings);
  await services.session.saveSnapshot(view);

  // Start game loop
  let tickAccumulator = 0;
  let tickInFlight = false;
  const tickRate = 1 / settings.tickRateHz;

  startGameLoop(
    (dt) => {
      tickAccumulator += dt;
      if (!tickInFlight && tickAccumulator >= tickRate) {
        tickAccumulator -= tickRate;
        tickInFlight = true;
        tickWorld()
          .then(async (tickResult) => {
            const nextView = await getWorldView();
            updateHud(nextView, settings);

            if (nextView.tick_count % settings.autoSaveEveryTicks === 0) {
              await services.session.saveSnapshot(nextView);
              document.getElementById("session")!.textContent = `saved at tick ${nextView.tick_count}`;
            }

            await services.comms.publish({
              level: resolveAlertLevel(tickResult.score_delta),
              source: "engine",
              message: `score delta ${tickResult.score_delta}`,
            });
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
