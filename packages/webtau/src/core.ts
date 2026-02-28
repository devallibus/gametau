/**
 * webtau — Tauri-to-web invoke router.
 *
 * Detects whether the app is running inside Tauri (desktop) or as a
 * plain web app. In Tauri mode, delegates to `@tauri-apps/api/core`.
 * In web mode, calls the corresponding function from a WASM module
 * that was registered via `configure()`.
 *
 * A runtime provider can be registered via `registerProvider()` to
 * route invoke() and convertFileSrc() through an arbitrary backend
 * (e.g. Electrobun). When no provider is registered and `isTauri()`
 * is true, Tauri auto-registers itself on first invoke().
 */

import type { CoreProvider } from "./provider";

export type { CoreProvider };

// biome-ignore lint/suspicious/noExplicitAny: WASM modules have dynamic signatures that cannot be statically typed
type WasmModule = Record<string, (...args: any[]) => any>;

let registeredProvider: CoreProvider | null = null;
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
 * Register a runtime provider that replaces the default Tauri/WASM
 * routing in `invoke()` and `convertFileSrc()`.
 *
 * ```ts
 * import { registerProvider } from "webtau";
 *
 * registerProvider({
 *   id: "electrobun",
 *   invoke: (cmd, args) => electrobun.ipc.invoke(cmd, args),
 *   convertFileSrc: (path) => `electrobun://asset/${path}`,
 * });
 * ```
 */
export function registerProvider(provider: CoreProvider): void {
  registeredProvider = provider;
}

/** Returns the currently registered provider, or `null`. */
export function getProvider(): CoreProvider | null {
  return registeredProvider;
}

/** Clears the registered provider (useful for testing). */
export function resetProvider(): void {
  registeredProvider = null;
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
 *
 * Loading is deduplicated: concurrent `invoke()` calls while the module is
 * still loading will share the same promise instead of triggering multiple
 * loads. On failure the promise is cleared so the next `invoke()` retries
 * the load (the user may have called `configure()` with a fixed loader).
 */
async function getWasmModule(): Promise<WasmModule> {
  // Fast path: module already loaded and cached.
  if (wasmModule) return wasmModule;

  // Deduplicate: if a load is already in flight, piggyback on it.
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
      // Clear promise so subsequent invoke() calls can retry after the
      // user fixes the issue (e.g. reconfigures with a valid loader).
      wasmLoadPromise = null;
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
 * In web mode: calls the matching WASM export, passing the args
 * object as a single parameter.
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
  // 1. Explicit provider — delegate immediately.
  if (registeredProvider) {
    return registeredProvider.invoke<T>(command, args);
  }

  // 2. Auto-detect Tauri — lazily register a Tauri provider, then delegate.
  if (isTauri()) {
    // Dynamic import — @tauri-apps/api is an optional peer dependency.
    // Only loaded at runtime inside Tauri, never in web builds.
    const mod = await import("@tauri-apps/api/core" as string);

    const tauriProvider: CoreProvider = {
      id: "tauri",
      invoke: (cmd, a) => mod.invoke(cmd, a),
      convertFileSrc: (path, protocol) => mod.convertFileSrc(path, protocol),
    };
    registeredProvider = tauriProvider;

    return tauriProvider.invoke<T>(command, args);
  }

  // 3. WASM path — unchanged.
  const wasm = await getWasmModule();
  const fn = wasm[command];

  if (typeof fn !== "function") {
    throw new Error(
      `[webtau] WASM module has no export named "${command}". ` +
        `Available: ${Object.keys(wasm).filter((k) => typeof wasm[k] === "function").join(", ")}`
    );
  }

  const result = args ? fn(args) : fn();

  // wasm_bindgen can return plain values or promises
  return result instanceof Promise ? result : (result as T);
}

/**
 * Converts a file path to a URL that can be used to load assets.
 *
 * In Tauri mode: delegates to `@tauri-apps/api/core`'s `convertFileSrc()`,
 * which returns an `asset://` protocol URL.
 * In web mode: returns the path as-is — no protocol conversion is needed
 * since web apps load assets via standard HTTP URLs.
 *
 * ```ts
 * const url = convertFileSrc("/app/data/sprite.png");
 * // web: "/app/data/sprite.png"
 * // Tauri: "asset://localhost/app/data/sprite.png"
 * ```
 */
export function convertFileSrc(filePath: string, protocol?: string): string {
  if (registeredProvider) {
    return registeredProvider.convertFileSrc(filePath, protocol);
  }
  // On web, just return the path as-is — no protocol conversion needed
  return filePath;
}
