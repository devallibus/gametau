/**
 * webtau/adapters/electrobun - Electrobun runtime adapter.
 *
 * Implements WindowAdapter, EventAdapter, FsAdapter, and DialogAdapter by
 * delegating each operation to the Electrobun backend via `invoke()`.
 */

import { invoke, registerProvider } from "../core.js";
import type {
  MessageDialogOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from "../dialog.js";
import { setDialogAdapter } from "../dialog.js";
import type { EventCallback, UnlistenFn } from "../event.js";
import { setEventAdapter } from "../event.js";
import type {
  CreateDirOptions,
  FsEntry,
  ReadDirOptions,
  RemoveOptions,
} from "../fs.js";
import { setFsAdapter } from "../fs.js";
import type {
  CoreProvider,
  DialogAdapter,
  EventAdapter,
  FsAdapter,
  RuntimeCapabilities,
  WindowAdapter,
} from "../provider.js";
import { setWindowAdapter } from "../window.js";

type InvokeArgs = Record<string, unknown> | undefined;

export type ElectrobunRenderMode = "browser" | "hybrid" | "gpu" | "unknown";

export interface ElectrobunCapabilities {
  runtime: "electrobun";
  renderMode: ElectrobunRenderMode;
  hasGpuWindow: boolean;
  hasWgpuView: boolean;
  hasWebGpu: boolean;
}

export interface ElectrobunBridge {
  invoke<T = unknown>(command: string, args?: InvokeArgs): Promise<T>;
  convertFileSrc?: (filePath: string, protocol?: string) => string;
  capabilities?: Partial<Omit<ElectrobunCapabilities, "runtime">>;
  renderMode?: ElectrobunRenderMode;
}

declare global {
  interface Window {
    __ELECTROBUN__?: ElectrobunBridge;
  }
}

function normalizeRenderMode(mode: string | undefined): ElectrobunRenderMode {
  switch (mode) {
    case "browser":
    case "hybrid":
    case "gpu":
      return mode;
    default:
      return "unknown";
  }
}

export function getElectrobunBridge(): ElectrobunBridge | null {
  if (typeof window === "undefined") return null;

  const bridge = window.__ELECTROBUN__;
  return bridge && typeof bridge.invoke === "function" ? bridge : null;
}

export function isElectrobun(): boolean {
  return getElectrobunBridge() !== null;
}

export function getElectrobunCapabilities(): ElectrobunCapabilities | null {
  const bridge = getElectrobunBridge();
  if (!bridge) return null;

  const renderMode = normalizeRenderMode(
    bridge.renderMode ?? bridge.capabilities?.renderMode,
  );
  const hasGpuWindow = bridge.capabilities?.hasGpuWindow ?? renderMode === "gpu";
  const hasWgpuView = bridge.capabilities?.hasWgpuView
    ?? (renderMode === "hybrid" || renderMode === "gpu");
  const hasWebGpu = bridge.capabilities?.hasWebGpu
    ?? (hasWgpuView || renderMode === "gpu");

  return {
    runtime: "electrobun",
    renderMode,
    hasGpuWindow,
    hasWgpuView,
    hasWebGpu,
  };
}

function getElectrobunRuntimeCapabilities(): RuntimeCapabilities {
  const capabilities = getElectrobunCapabilities();

  return {
    events: true,
    fs: true,
    dialog: true,
    window: true,
    task: true,
    convertFileSrc: true,
    renderMode: capabilities?.renderMode ?? "unknown",
    hasGpuWindow: capabilities?.hasGpuWindow ?? false,
    hasWgpuView: capabilities?.hasWgpuView ?? false,
    hasWebGpu: capabilities?.hasWebGpu ?? false,
  };
}

export function createElectrobunWindowBridgeProvider(
  bridge: ElectrobunBridge = getElectrobunBridge() as ElectrobunBridge,
): CoreProvider {
  if (!bridge || typeof bridge.invoke !== "function") {
    throw new Error(
      "[webtau/electrobun] No window.__ELECTROBUN__ bridge is available.",
    );
  }

  return {
    id: "electrobun",
    invoke: (command, args) => bridge.invoke(command, args),
    convertFileSrc: (filePath, protocol) => (
      bridge.convertFileSrc
        ? bridge.convertFileSrc(filePath, protocol)
        : `electrobun://asset/${filePath.replace(/^\/+/, "")}`
    ),
    runtimeInfo: {
      id: "electrobun",
      platform: "desktop",
      capabilities: getElectrobunRuntimeCapabilities(),
    },
  };
}

export function createElectrobunWindowAdapter(): WindowAdapter {
  return {
    async isFullscreen(): Promise<boolean> {
      return invoke<boolean>("plugin:electrobun|window_is_fullscreen");
    },

    async setFullscreen(fullscreen: boolean): Promise<void> {
      await invoke<void>("plugin:electrobun|window_set_fullscreen", { fullscreen });
    },

    async innerSize(): Promise<{ width: number; height: number; type: string }> {
      return invoke<{ width: number; height: number; type: string }>(
        "plugin:electrobun|window_inner_size",
      );
    },

    async outerSize(): Promise<{ width: number; height: number; type: string }> {
      return invoke<{ width: number; height: number; type: string }>(
        "plugin:electrobun|window_outer_size",
      );
    },

    async setSize(size: { width: number; height: number; type: string }): Promise<void> {
      await invoke<void>("plugin:electrobun|window_set_size", {
        width: size.width,
        height: size.height,
        type: size.type,
      });
    },

    async maximize(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_maximize");
    },

    async isMaximized(): Promise<boolean> {
      return invoke<boolean>("plugin:electrobun|window_is_maximized");
    },

    async title(): Promise<string> {
      return invoke<string>("plugin:electrobun|window_title");
    },

    async setTitle(title: string): Promise<void> {
      await invoke<void>("plugin:electrobun|window_set_title", { title });
    },

    async close(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_close");
    },

    async minimize(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_minimize");
    },

    async unminimize(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_unminimize");
    },

    async show(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_show");
    },

    async hide(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_hide");
    },

    async setDecorations(decorations: boolean): Promise<void> {
      await invoke<void>("plugin:electrobun|window_set_decorations", { decorations });
    },

    async center(): Promise<void> {
      await invoke<void>("plugin:electrobun|window_center");
    },

    async currentMonitor(): Promise<{
      name: string | null;
      size: { width: number; height: number };
      position: { x: number; y: number };
      scaleFactor: number;
    } | null> {
      return invoke<{
        name: string | null;
        size: { width: number; height: number };
        position: { x: number; y: number };
        scaleFactor: number;
      } | null>("plugin:electrobun|window_current_monitor");
    },

    async scaleFactor(): Promise<number> {
      return invoke<number>("plugin:electrobun|window_scale_factor");
    },
  };
}

export function createElectrobunEventAdapter(): EventAdapter {
  return {
    async listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
      const listenerId = await invoke<number>("plugin:electrobun|event_listen", { event });

      electrobunEventHandlers.set(listenerId, {
        event,
        handler: handler as EventCallback<unknown>,
      });

      return () => {
        electrobunEventHandlers.delete(listenerId);
        invoke<void>("plugin:electrobun|event_unlisten", { listenerId }).catch(() => {
          // Best-effort cleanup.
        });
      };
    },

    async emit<T>(event: string, payload?: T): Promise<void> {
      await invoke<void>("plugin:electrobun|event_emit", { event, payload });
    },
  };
}

const electrobunEventHandlers = new Map<
  number,
  { event: string; handler: EventCallback<unknown> }
>();

export function dispatchElectrobunEvent(
  listenerId: number,
  event: string,
  payload: unknown,
): void {
  const entry = electrobunEventHandlers.get(listenerId);
  if (entry) {
    entry.handler({ event, id: listenerId, payload });
  }
}

export function createElectrobunFsAdapter(): FsAdapter {
  return {
    async writeTextFile(path: string, contents: string): Promise<void> {
      await invoke<void>("plugin:electrobun|fs_write_text_file", { path, contents });
    },

    async readTextFile(path: string): Promise<string> {
      return invoke<string>("plugin:electrobun|fs_read_text_file", { path });
    },

    async writeFile(
      path: string,
      contents: Uint8Array | ArrayBuffer | number[] | string,
    ): Promise<void> {
      let data: number[];
      if (contents instanceof Uint8Array) {
        data = Array.from(contents);
      } else if (contents instanceof ArrayBuffer) {
        data = Array.from(new Uint8Array(contents));
      } else if (Array.isArray(contents)) {
        data = contents;
      } else {
        data = Array.from(new TextEncoder().encode(contents));
      }
      await invoke<void>("plugin:electrobun|fs_write_file", { path, data });
    },

    async readFile(path: string): Promise<Uint8Array> {
      const data = await invoke<number[]>("plugin:electrobun|fs_read_file", { path });
      return new Uint8Array(data);
    },

    async exists(path: string): Promise<boolean> {
      return invoke<boolean>("plugin:electrobun|fs_exists", { path });
    },

    async mkdir(path: string, options?: CreateDirOptions): Promise<void> {
      await invoke<void>("plugin:electrobun|fs_mkdir", {
        path,
        recursive: options?.recursive ?? false,
      });
    },

    async readDir(path: string, options?: ReadDirOptions): Promise<FsEntry[]> {
      return invoke<FsEntry[]>("plugin:electrobun|fs_read_dir", {
        path,
        recursive: options?.recursive ?? false,
      });
    },

    async remove(path: string, options?: RemoveOptions): Promise<void> {
      await invoke<void>("plugin:electrobun|fs_remove", {
        path,
        recursive: options?.recursive ?? false,
      });
    },

    async copyFile(fromPath: string, toPath: string): Promise<void> {
      await invoke<void>("plugin:electrobun|fs_copy_file", { fromPath, toPath });
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      await invoke<void>("plugin:electrobun|fs_rename", { oldPath, newPath });
    },
  };
}

export function createElectrobunDialogAdapter(): DialogAdapter {
  return {
    async message(text: string, options?: MessageDialogOptions): Promise<void> {
      await invoke<void>("plugin:electrobun|dialog_message", {
        text,
        title: options?.title,
        okLabel: options?.okLabel,
      });
    },

    async ask(text: string, options?: MessageDialogOptions): Promise<boolean> {
      return invoke<boolean>("plugin:electrobun|dialog_ask", {
        text,
        title: options?.title,
        okLabel: options?.okLabel,
        cancelLabel: options?.cancelLabel,
      });
    },

    async open(options?: OpenDialogOptions): Promise<string | string[] | null> {
      return invoke<string | string[] | null>("plugin:electrobun|dialog_open", {
        title: options?.title,
        multiple: options?.multiple ?? false,
        directory: options?.directory ?? false,
        filters: options?.filters,
      });
    },

    async save(options?: SaveDialogOptions): Promise<string | null> {
      return invoke<string | null>("plugin:electrobun|dialog_save", {
        title: options?.title,
        defaultPath: options?.defaultPath,
      });
    },
  };
}

export function createElectrobunCoreProvider(): CoreProvider {
  return {
    id: "electrobun",
    invoke: async <T = unknown>(command: string, _args?: InvokeArgs): Promise<T> => {
      throw new Error(
        `[webtau/electrobun] No IPC bridge configured. ` +
          `Cannot invoke "${command}". Wire electrobun.ipc.invoke() ` +
          `into the core provider before calling bootstrapElectrobun().`,
      );
    },
    convertFileSrc: (filePath: string): string => {
      return `electrobun://asset/${filePath.replace(/^\/+/, "")}`;
    },
    runtimeInfo: {
      id: "electrobun",
      platform: "desktop",
      capabilities: getElectrobunRuntimeCapabilities(),
    },
  };
}

export function bootstrapElectrobun(coreProvider?: CoreProvider): void {
  registerProvider(coreProvider ?? createElectrobunCoreProvider());
  setWindowAdapter(createElectrobunWindowAdapter());
  setEventAdapter(createElectrobunEventAdapter());
  setFsAdapter(createElectrobunFsAdapter());
  setDialogAdapter(createElectrobunDialogAdapter());
}

export function bootstrapElectrobunFromWindowBridge(): boolean {
  const bridge = getElectrobunBridge();
  if (!bridge) return false;

  bootstrapElectrobun(createElectrobunWindowBridgeProvider(bridge));
  return true;
}
