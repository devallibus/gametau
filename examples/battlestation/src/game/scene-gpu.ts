import { GpuWindow, webgpu } from "electrobun/bun";
import { WebGPURenderer } from "three/webgpu";
import type { SceneTheme } from "./config";
import { createDefenseSceneWithRenderer } from "./scene";

export function createDefenseSceneGpu(
  window: GpuWindow,
  theme: Partial<SceneTheme> = {},
) {
  webgpu.install();
  const canvas = webgpu.utils.createCanvasShim(window);
  const renderer = new WebGPURenderer({
    canvas: canvas as unknown as HTMLCanvasElement,
    antialias: true,
  });

  return createDefenseSceneWithRenderer(
    canvas as unknown as {
      width: number;
      height: number;
      getBoundingClientRect(): {
        left?: number;
        top?: number;
        width: number;
        height: number;
      };
    },
    renderer as unknown as {
      setClearColor: (color: unknown, alpha?: number) => void;
      setSize: (width: number, height: number, updateStyle?: boolean) => void;
      render: (scene: unknown, camera: unknown) => void;
      dispose: () => void;
    },
    theme,
    () => 1,
  );
}
