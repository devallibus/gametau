/**
 * webtau/adapters/electrobun — Electrobun runtime adapter.
 *
 * Implements WindowAdapter, EventAdapter, FsAdapter, and DialogAdapter
 * by delegating each operation to the Electrobun backend via `invoke()`.
 *
 * Usage:
 * ```ts
 * import { bootstrapElectrobun } from "webtau/adapters/electrobun";
 *
 * bootstrapElectrobun();
 * ```
 */

import { invoke, registerProvider } from "../core";
import type {
  MessageDialogOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from "../dialog";
import { setDialogAdapter } from "../dialog";
import type { EventCallback, UnlistenFn } from "../event";
import { setEventAdapter } from "../event";
import type {
  CreateDirOptions,
  FsEntry,
  ReadDirOptions,
  RemoveOptions,
} from "../fs";
import { setFsAdapter } from "../fs";
import type {
  CoreProvider,
  DialogAdapter,
  EventAdapter,
  FsAdapter,
  WindowAdapter,
} from "../provider";
import { setWindowAdapter } from "../window";

// ── Window Adapter ──────────────────────────────────────────────────────────
// Supported: isFullscreen, setFullscreen, innerSize, outerSize, setSize,
//            title, setTitle, close, minimize, unminimize, maximize,
//            isMaximized, show, hide, setDecorations, scaleFactor,
//            currentMonitor
// Partial:   center (depends on backend window manager support)
// Unsupported: none currently

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

    // Partial: centering depends on the Electrobun backend's window
    // manager integration. May be a no-op on some platforms.
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

// ── Event Adapter ───────────────────────────────────────────────────────────
// Supported: listen, emit
// Partial:   none
// Unsupported: none currently
//
// Note: The event system relies on the Electrobun backend to manage event
// subscriptions. The `listen` call returns an unlisten ID that is used to
// remove the subscription on the backend when `unlisten()` is called.

export function createElectrobunEventAdapter(): EventAdapter {
  return {
    async listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
      const listenerId = await invoke<number>(
        "plugin:electrobun|event_listen",
        { event },
      );

      // Register a callback bridge — in a real Electrobun integration this
      // would wire into the IPC message channel. Here we store the handler
      // so the backend can dispatch events to it.
      electrobunEventHandlers.set(listenerId, { event, handler: handler as EventCallback<unknown> });

      return () => {
        electrobunEventHandlers.delete(listenerId);
        invoke<void>("plugin:electrobun|event_unlisten", { listenerId }).catch(() => {
          // Best-effort cleanup — ignore errors during unlisten.
        });
      };
    },

    async emit<T>(event: string, payload?: T): Promise<void> {
      await invoke<void>("plugin:electrobun|event_emit", { event, payload });
    },
  };
}

/** Internal registry for event handlers keyed by listener ID. */
const electrobunEventHandlers = new Map<
  number,
  { event: string; handler: EventCallback<unknown> }
>();

/**
 * Dispatch an event from the Electrobun backend to a registered handler.
 * Called by the IPC bridge when the backend pushes an event.
 */
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

// ── Filesystem Adapter ──────────────────────────────────────────────────────
// Supported: writeTextFile, readTextFile, writeFile, readFile, exists,
//            mkdir, readDir, remove, copyFile, rename
// Partial:   none
// Unsupported: none currently
//
// Note: Binary data (Uint8Array/ArrayBuffer) is serialized as a number[]
// for JSON transport over IPC. The backend is responsible for converting
// back to native byte buffers.

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
      // Serialize binary data as number[] for JSON IPC transport.
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

// ── Dialog Adapter ──────────────────────────────────────────────────────────
// Supported: message, ask, open, save
// Partial:   none
// Unsupported: none currently
//
// Note: Dialog appearance and behavior depend on the Electrobun backend's
// native dialog implementation. Options are forwarded as-is.

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

// ── Bootstrap ───────────────────────────────────────────────────────────────

/**
 * Core provider for the Electrobun runtime.
 *
 * Provides the `invoke` and `convertFileSrc` implementations that all
 * adapters delegate through.
 */
export function createElectrobunCoreProvider(): CoreProvider {
  return {
    id: "electrobun",
    invoke: async <T = unknown>(
      command: string,
      _args?: Record<string, unknown>,
    ): Promise<T> => {
      // In a real Electrobun integration, this would delegate to
      // electrobun.ipc.invoke(). For now, we throw to indicate
      // that the actual IPC bridge must be provided at integration time.
      //
      // When integrating, replace this with:
      //   return electrobun.ipc.invoke(command, args) as Promise<T>;
      throw new Error(
        `[webtau/electrobun] No IPC bridge configured. ` +
          `Cannot invoke "${command}". Wire electrobun.ipc.invoke() ` +
          `into the core provider before calling bootstrapElectrobun().`,
      );
    },
    convertFileSrc: (filePath: string, _protocol?: string): string => {
      return `electrobun://asset/${filePath.replace(/^\/+/, "")}`;
    },
  };
}

/**
 * Bootstrap all Electrobun adapters at once.
 *
 * Registers the core provider and sets adapters for window, event,
 * filesystem, and dialog modules. After calling this function, all
 * webtau module-level functions will delegate through Electrobun.
 *
 * An optional `coreProvider` can be passed to supply a custom IPC
 * bridge (e.g. one that delegates to `electrobun.ipc.invoke()`).
 *
 * ```ts
 * import { bootstrapElectrobun } from "webtau/adapters/electrobun";
 *
 * bootstrapElectrobun({
 *   id: "electrobun",
 *   invoke: (cmd, args) => electrobun.ipc.invoke(cmd, args),
 *   convertFileSrc: (path) => `electrobun://asset/${path}`,
 * });
 * ```
 */
export function bootstrapElectrobun(coreProvider?: CoreProvider): void {
  registerProvider(coreProvider ?? createElectrobunCoreProvider());
  setWindowAdapter(createElectrobunWindowAdapter());
  setEventAdapter(createElectrobunEventAdapter());
  setFsAdapter(createElectrobunFsAdapter());
  setDialogAdapter(createElectrobunDialogAdapter());
}
