/**
 * webtau/provider - Adapter interfaces for runtime providers.
 *
 * Types only - no runtime logic. Each interface defines the contract that a
 * runtime provider (Tauri, Electrobun, etc.) must implement for the
 * corresponding webtau module.
 */

import type {
  MessageDialogOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from "./dialog.js";
import type { EventCallback, UnlistenFn } from "./event.js";
import type {
  CreateDirOptions,
  FsEntry,
  ReadDirOptions,
  RemoveOptions,
} from "./fs.js";

export interface RuntimeCapabilities {
  events: boolean;
  fs: boolean;
  dialog: boolean;
  window: boolean;
  task: boolean;
  convertFileSrc: boolean;
  renderMode?: string;
  hasGpuWindow?: boolean;
  hasWgpuView?: boolean;
  hasWebGpu?: boolean;
}

export interface RuntimeInfo {
  id: string;
  platform: "web" | "desktop";
  capabilities: RuntimeCapabilities;
}

export type RuntimeInfoResolver = RuntimeInfo | (() => RuntimeInfo);

export interface CoreProvider {
  /** Unique identifier for this runtime (for example "tauri" or "electrobun"). */
  id: string;

  /** Invoke a command on the runtime backend. */
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;

  /** Convert a file path to a URL suitable for loading assets. */
  convertFileSrc(filePath: string, protocol?: string): string;

  /** Optional runtime/capability metadata for capability-based branching. */
  runtimeInfo?: RuntimeInfoResolver;
}

export interface WindowAdapter {
  isFullscreen(): Promise<boolean>;
  setFullscreen(fullscreen: boolean): Promise<void>;
  innerSize(): Promise<{ width: number; height: number; type: string }>;
  outerSize(): Promise<{ width: number; height: number; type: string }>;
  setSize(size: { width: number; height: number; type: string }): Promise<void>;
  maximize(): Promise<void>;
  isMaximized(): Promise<boolean>;
  title(): Promise<string>;
  setTitle(title: string): Promise<void>;
  close(): Promise<void>;
  minimize(): Promise<void>;
  unminimize(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  setDecorations(decorations: boolean): Promise<void>;
  center(): Promise<void>;
  currentMonitor(): Promise<{
    name: string | null;
    size: { width: number; height: number };
    position: { x: number; y: number };
    scaleFactor: number;
  } | null>;
  scaleFactor(): Promise<number>;
}

export interface EventAdapter {
  listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn>;
  emit<T>(event: string, payload?: T): Promise<void>;
}

export interface FsAdapter {
  writeTextFile(path: string, contents: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeFile(path: string, contents: Uint8Array | ArrayBuffer | number[] | string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: CreateDirOptions): Promise<void>;
  readDir(path: string, options?: ReadDirOptions): Promise<FsEntry[]>;
  remove(path: string, options?: RemoveOptions): Promise<void>;
  copyFile(fromPath: string, toPath: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export interface DialogAdapter {
  message(text: string, options?: MessageDialogOptions): Promise<void>;
  ask(text: string, options?: MessageDialogOptions): Promise<boolean>;
  open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  save(options?: SaveDialogOptions): Promise<string | null>;
}
