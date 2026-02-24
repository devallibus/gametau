/**
 * webtau — Tauri-to-web invoke router.
 *
 * Detects whether the app is running inside Tauri (desktop) or as a
 * plain web app. In Tauri mode, delegates to `@tauri-apps/api/core`.
 * In web mode, calls the corresponding function from a WASM module
 * that was registered via `configure()`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WasmModule = Record<string, (...args: any[]) => any>;

let wasmModule: WasmModule | null = null;
let wasmLoader: (() => Promise<WasmModule>) | null = null;
let wasmLoadPromise: Promise<WasmModule> | null = null;

export interface WebtauConfig {
  /**
   * A function that returns the WASM module (or a promise for it).
   * This is typically `() => import("./wasm")` pointing at the
   * wasm-pack output.
   */
  loadWasm: () => Promise<WasmModule>;

  /**
   * Called if the WASM module fails to load.
   * Defaults to `console.error`.
   */
  onLoadError?: (error: unknown) => void;
}

let onLoadError: (error: unknown) => void = (err) => {
  console.error("[webtau] Failed to load WASM module:", err);
};

/**
 * Configure webtau for web mode. Must be called before the first
 * `invoke()` in a web build. In Tauri mode this is a no-op.
 *
 * ```ts
 * import { configure } from "webtau";
 *
 * configure({
 *   loadWasm: () => import("./wasm"),
 * });
 * ```
 */
export function configure(config: WebtauConfig): void {
  wasmLoader = config.loadWasm;
  wasmModule = null;
  wasmLoadPromise = null;
  if (config.onLoadError) {
    onLoadError = config.onLoadError;
  }
}

/**
 * Returns `true` when running inside Tauri.
 * Checks for `window.__TAURI_INTERNALS__` which Tauri injects.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  );
}

/**
 * Lazily loads and caches the WASM module.
 */
async function getWasmModule(): Promise<WasmModule> {
  if (wasmModule) return wasmModule;

  if (wasmLoadPromise) return wasmLoadPromise;

  if (!wasmLoader) {
    throw new Error(
      "[webtau] No WASM module configured. " +
        'Call configure({ loadWasm: () => import("./wasm") }) before invoke().'
    );
  }

  wasmLoadPromise = wasmLoader().then(
    (mod) => {
      wasmModule = mod;
      return mod;
    },
    (err) => {
      wasmLoadPromise = null; // Allow retry
      onLoadError(err);
      throw err;
    }
  );

  return wasmLoadPromise;
}

/**
 * Universal invoke — same API as `@tauri-apps/api/core`'s `invoke()`.
 *
 * In Tauri mode: delegates to Tauri IPC.
 * In web mode: calls the matching WASM export, passing args as
 * positional parameters (via `Object.values()`).
 *
 * ```ts
 * const view = await invoke<WorldView>("get_world_view");
 * const result = await invoke<TickResult>("tick_world");
 * ```
 */
export async function invoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (isTauri()) {
    // Dynamic import — @tauri-apps/api is an optional peer dependency.
    // Only loaded at runtime inside Tauri, never in web builds.
    const mod: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T> } =
      await import("@tauri-apps/api/core" as string);
    return mod.invoke(command, args);
  }

  const wasm = await getWasmModule();
  const fn = wasm[command];

  if (typeof fn !== "function") {
    throw new Error(
      `[webtau] WASM module has no export named "${command}". ` +
        `Available: ${Object.keys(wasm).filter((k) => typeof wasm[k] === "function").join(", ")}`
    );
  }

  const result = args ? fn(...Object.values(args)) : fn();

  // wasm_bindgen can return plain values or promises
  return result instanceof Promise ? result : (result as T);
}
