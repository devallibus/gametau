import { configure } from "webtau";
import { GpuWindow, Screen } from "electrobun/bun";
import { FALLBACK_MISSION, FALLBACK_THEME } from "../game/config";
import { createDefenseSceneGpu } from "../game/scene-gpu";
import { startBattlestationRuntime } from "../game/runtime";

const LEFT_KEYS = new Set([37, 65, 123]);
const RIGHT_KEYS = new Set([39, 68, 124]);
const FIRE_KEYS = new Set([13, 32]);
const MUTE_KEYS = new Set([77]);

function createSilentAudioAdapter() {
  return {
    setMasterVolume() {},
    setMuted() {},
    async resume() {},
    async playTone() {},
  };
}

async function loadRuntime() {
  configure({
    loadWasm: async () => {
      const wasm = await import("../wasm/battlestation_wasm");
      await wasm.default();
      wasm.init();
      return wasm;
    },
  });
}

async function main() {
  await loadRuntime();

  const window = new GpuWindow({
    title: "A130 Defense (GPUWindow)",
    frame: { x: 120, y: 120, width: 960, height: 960 },
    titleBarStyle: "default",
    transparent: false,
  });

  const pressedKeys = new Set<number>();
  let mouseLatch = false;
  let lastProfile = "runs 0 / best 0";
  let lastAlert = "Stand by.";

  window.on("keyDown", (event) => {
    const data = event as { data?: { keyCode?: number } };
    if (typeof data.data?.keyCode === "number") {
      pressedKeys.add(data.data.keyCode);
    }
  });
  window.on("keyUp", (event) => {
    const data = event as { data?: { keyCode?: number } };
    if (typeof data.data?.keyCode === "number") {
      pressedKeys.delete(data.data.keyCode);
    }
  });

  const scene = createDefenseSceneGpu(window, FALLBACK_THEME.scene);

  const stop = await startBattlestationRuntime({
    mission: FALLBACK_MISSION,
    theme: FALLBACK_THEME,
    scene,
    audio: createSilentAudioAdapter(),
    controls: {
      getSelectionAxis() {
        if ([...LEFT_KEYS].some((key) => pressedKeys.has(key))) return -1;
        if ([...RIGHT_KEYS].some((key) => pressedKeys.has(key))) return 1;
        return 0;
      },
      getFirePressed() {
        return [...FIRE_KEYS].some((key) => pressedKeys.has(key));
      },
      getMutePressed() {
        return [...MUTE_KEYS].some((key) => pressedKeys.has(key));
      },
      drainPointerTargets() {
        const buttons = Screen.getMouseButtons();
        const leftDown = (buttons & 1n) === 1n;
        const targets: Array<{ x: number; y: number }> = [];

        if (leftDown && !mouseLatch) {
          const cursor = Screen.getCursorScreenPoint();
          const frame = window.getFrame();
          const inside = cursor.x >= frame.x
            && cursor.x <= frame.x + frame.width
            && cursor.y >= frame.y
            && cursor.y <= frame.y + frame.height;
          if (inside && frame.width > 0 && frame.height > 0) {
            targets.push({
              x: ((cursor.x - frame.x) / frame.width) * 640,
              y: ((cursor.y - frame.y) / frame.height) * 640,
            });
          }
        }

        mouseLatch = leftDown;
        return targets;
      },
      dispose() {},
    },
    hud: {
      updateMission(view) {
        const target = view.selected_contact_id === null ? "NONE" : `#${view.selected_contact_id}`;
        window.setTitle(
          `A130 Defense | ${view.mission_state} | score ${view.score} | integrity ${view.integrity} | target ${target}`,
        );
      },
      updateProfile(profile) {
        lastProfile = `runs ${profile.missionsRun} / best ${profile.bestScore}`;
      },
      setAlert(text) {
        lastAlert = text;
        console.log(text);
      },
      setAlertLog(lines) {
        if (lines.length > 0) {
          console.log(lines[0]);
        }
      },
      setStatus(text) {
        window.setTitle(`${text} | ${lastProfile} | ${lastAlert}`);
      },
    },
  });

  window.on("close", () => {
    stop();
  });
}

main().catch(console.error);
