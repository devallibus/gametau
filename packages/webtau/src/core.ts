/**
 * webtau - Tauri-to-web invoke router.
 *
 * Detects whether the app is running inside Tauri (desktop) or as a plain web
 * app. In Tauri mode, delegates to `@tauri-apps/api/core`. In web mode, calls
 * the corresponding function from a configured WASM module. A runtime provider
 * can be registered to route invoke and asset conversion through an arbitrary
 * backend (for example Electrobun).
 */

import { WebtauError } from "./diagnostics.js";
import type {
  CoreProvider,
  RuntimeCapabilities,
  RuntimeInfo,
  RuntimeInfoResolver,
} from "./provider.js";

export type { CoreProvider, RuntimeCapabilities, RuntimeInfo, RuntimeInfoResolver };
export type { DiagnosticCode, DiagnosticEnvelope } from "./diagnostics.js";
export { WebtauError } from "./diagnostics.js";

// biome-ignore lint/suspicious/noExplicitAny: WASM modules have dynamic signatures that cannot be statically typed
type WasmModule = Record<string, (...args: any[]) => any>;

type ElectrobunRuntimeBridge = {
  capabilities?: Partial<Pick<
    RuntimeCapabilities,
    "renderMode" | "hasGpuWindow" | "hasWgpuView" | "hasWebGpu"
  >>;
  renderMode?: string;
};

let registeredProvider: CoreProvider | null = null;
let wasmModule: WasmModule | null = null;
let wasmLoader: (() => Promise<WasmModule>) | null = null;
let wasmLoadPromise: Promise<WasmModule> | null = null;

export interface WebtauConfig {
  loadWasm: () => Promise<WasmModule>;
  onLoadError?: (error: unknown) => void;
}

let onLoadError: (error: unknown) => void = (err) => {
  console.error("[webtau] Failed to load WASM module:", err);
};

const wasmCapabilities: RuntimeCapabilities = {
  events: true,
  fs: true,
  dialog: true,
  window: true,
  task: true,
  convertFileSrc: true,
};

const tauriCapabilities: RuntimeCapabilities = {
  events: true,
  fs: true,
  dialog: true,
  window: true,
  task: true,
  convertFileSrc: true,
};

function cloneRuntimeInfo(info: RuntimeInfo): RuntimeInfo {
  return {
    ...info,
    capabilities: { ...info.capabilities },
  };
}

function normalizeElectrobunRenderMode(mode: string | undefined): string {
  switch (mode) {
    case "browser":
    case "hybrid":
    case "gpu":
      return mode;
    default:
      return "unknown";
  }
}

function getElectrobunBridgeCapabilities(): RuntimeCapabilities {
  // Fallback capability derivation for bare provider registrations. The
  // Electrobun adapter remains the authoritative path when runtimeInfo is
  // supplied explicitly by the provider itself.
  const bridge = typeof window !== "undefined"
    ? (window as typeof window & { __ELECTROBUN__?: ElectrobunRuntimeBridge }).__ELECTROBUN__
    : undefined;
  const renderMode = normalizeElectrobunRenderMode(
    bridge?.renderMode ?? bridge?.capabilities?.renderMode,
  );
  const hasGpuWindow = bridge?.capabilities?.hasGpuWindow ?? renderMode === "gpu";
  const hasWgpuView = bridge?.capabilities?.hasWgpuView
    ?? (renderMode === "hybrid" || renderMode === "gpu");
  const hasWebGpu = bridge?.capabilities?.hasWebGpu
    ?? (hasWgpuView || renderMode === "gpu");

  return {
    events: true,
    fs: true,
    dialog: true,
    window: true,
    task: true,
    convertFileSrc: true,
    renderMode,
    hasGpuWindow,
    hasWgpuView,
    hasWebGpu,
  };
}

function deriveRuntimeInfo(provider: CoreProvider): RuntimeInfo {
  const resolved = typeof provider.runtimeInfo === "function"
    ? provider.runtimeInfo()
    : provider.runtimeInfo;
  if (resolved) {
    return cloneRuntimeInfo(resolved);
  }

  if (provider.id === "tauri") {
    return {
      id: "tauri",
      platform: "desktop",
      capabilities: { ...tauriCapabilities },
    };
  }

  if (provider.id === "electrobun") {
    return {
      id: "electrobun",
      platform: "desktop",
      capabilities: getElectrobunBridgeCapabilities(),
    };
  }

  return {
    id: provider.id,
    platform: "desktop",
    capabilities: {
      events: false,
      fs: false,
      dialog: false,
      window: false,
      task: true,
      convertFileSrc: true,
    },
  };
}

export function configure(config: WebtauConfig): void {
  wasmLoader = config.loadWasm;
  wasmModule = null;
  wasmLoadPromise = null;
  if (config.onLoadError) {
    onLoadError = config.onLoadError;
  }
}

export function registerProvider(provider: CoreProvider): void {
  registeredProvider = provider;
}

export function getProvider(): CoreProvider | null {
  return registeredProvider;
}

export function resetProvider(): void {
  registeredProvider = null;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function getRuntimeInfo(): RuntimeInfo {
  if (registeredProvider) {
    return deriveRuntimeInfo(registeredProvider);
  }

  if (isTauri()) {
    return {
      id: "tauri",
      platform: "desktop",
      capabilities: { ...tauriCapabilities },
    };
  }

  return {
    id: "wasm",
    platform: "web",
    capabilities: { ...wasmCapabilities },
  };
}

async function getWasmModule(): Promise<WasmModule> {
  if (wasmModule) return wasmModule;
  if (wasmLoadPromise) return wasmLoadPromise;

  if (!wasmLoader) {
    throw new WebtauError({
      code: "NO_WASM_CONFIGURED",
      runtime: "wasm",
      command: "",
      message: "[webtau] No WASM module configured.",
      hint: 'Call configure({ loadWasm: () => import("./wasm") }) before invoke().',
    });
  }

  wasmLoadPromise = wasmLoader().then(
    (mod) => {
      wasmModule = mod;
      return mod;
    },
    (err) => {
      wasmLoadPromise = null;
      onLoadError(err);
      throw new WebtauError({
        code: "LOAD_FAILED",
        runtime: "wasm",
        command: "",
        message: `[webtau] Failed to load WASM module: ${err instanceof Error ? err.message : String(err)}`,
        hint: "Check that loadWasm returns a valid WASM module and network is available.",
      });
    },
  );

  return wasmLoadPromise;
}

export async function invoke<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (registeredProvider) {
    try {
      return await registeredProvider.invoke<T>(command, args);
    } catch (err) {
      if (err instanceof WebtauError) throw err;
      throw new WebtauError({
        code: "PROVIDER_ERROR",
        runtime: registeredProvider.id,
        command,
        message: err instanceof Error ? err.message : String(err),
        hint: `Provider "${registeredProvider.id}" threw while invoking "${command}". Check the provider implementation.`,
      });
    }
  }

  if (isTauri()) {
    const mod = await import("@tauri-apps/api/core" as string);

    const tauriProvider: CoreProvider = {
      id: "tauri",
      invoke: (cmd, a) => mod.invoke(cmd, a),
      convertFileSrc: (path, protocol) => mod.convertFileSrc(path, protocol),
      runtimeInfo: {
        id: "tauri",
        platform: "desktop",
        capabilities: { ...tauriCapabilities },
      },
    };
    registeredProvider = tauriProvider;

    return tauriProvider.invoke<T>(command, args);
  }

  const wasm = await getWasmModule();
  const fn = wasm[command];

  if (typeof fn !== "function") {
    const available = Object.keys(wasm).filter((k) => typeof wasm[k] === "function").join(", ");
    throw new WebtauError({
      code: "UNKNOWN_COMMAND",
      runtime: "wasm",
      command,
      message: `[webtau] WASM module has no export named "${command}". Available: ${available}`,
      hint: `Export "${command}" is not defined. Available exports: ${available}`,
    });
  }

  try {
    const result = args ? fn(args) : fn();

    if (result instanceof Promise) {
      try {
        return await result;
      } catch (asyncErr) {
        if (asyncErr instanceof WebtauError) throw asyncErr;
        throw new WebtauError({
          code: "PROVIDER_ERROR",
          runtime: "wasm",
          command,
          message: asyncErr instanceof Error ? asyncErr.message : String(asyncErr),
          hint: `WASM command "${command}" rejected. Check the Rust implementation for errors.`,
        });
      }
    }

    return result as T;
  } catch (execErr) {
    if (execErr instanceof WebtauError) throw execErr;
    throw new WebtauError({
      code: "PROVIDER_ERROR",
      runtime: "wasm",
      command,
      message: execErr instanceof Error ? execErr.message : String(execErr),
      hint: `WASM command "${command}" threw an error. Check the Rust implementation.`,
    });
  }
}

export function convertFileSrc(filePath: string, protocol?: string): string {
  if (registeredProvider) {
    return registeredProvider.convertFileSrc(filePath, protocol);
  }

  return filePath;
}
