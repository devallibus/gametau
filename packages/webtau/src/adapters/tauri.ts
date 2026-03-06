/**
 * webtau/adapters/tauri — Tauri runtime adapter.
 *
 * Implements EventAdapter by delegating to @tauri-apps/api/event, giving
 * Tauri the same deterministic listen/unlisten semantics as other runtimes.
 *
 * Usage:
 * ```ts
 * import { bootstrapTauri } from "webtau/adapters/tauri";
 * bootstrapTauri();
 * ```
 */

import { registerProvider } from "../core.js";
import type { EventCallback, UnlistenFn } from "../event.js";
import { setEventAdapter } from "../event.js";
import type { CoreProvider, EventAdapter } from "../provider.js";

// ── Typed shapes for dynamically imported Tauri modules ─────────────────────
// @tauri-apps/api is an optional peer dependency. These interfaces describe
// only the members we use so we can safely cast the dynamic import result
// without pulling in the full @tauri-apps/api type surface.

interface TauriEventModule {
  listen: <T>(
    event: string,
    handler: (ev: { event: string; id: number; payload: T }) => void,
  ) => Promise<() => void>;
  emit: (event: string, payload?: unknown) => Promise<void>;
}

interface TauriCoreModule {
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
}

// ── Event Adapter ───────────────────────────────────────────────────────────
// Wraps @tauri-apps/api/event listen/emit for use as webtau EventAdapter.
// The id field on each dispatched event is the numeric listener id assigned
// by Tauri's own IPC layer (tauriEvent.id).

export function createTauriEventAdapter(): EventAdapter {
  return {
    async listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
      // Dynamic import so @tauri-apps/api is only loaded at runtime in Tauri.
      const mod = await import("@tauri-apps/api/event" as string) as TauriEventModule;
      const unlisten = await mod.listen<T>(
        event,
        (tauriEvent) => {
          handler({ event: tauriEvent.event, id: tauriEvent.id, payload: tauriEvent.payload });
        },
      );
      return unlisten as UnlistenFn;
    },

    async emit<T>(event: string, payload?: T): Promise<void> {
      const mod = await import("@tauri-apps/api/event" as string) as TauriEventModule;
      await mod.emit(event, payload);
    },
  };
}

// ── Core Provider ─────────────────────────────────────────────────────────────
// Wraps @tauri-apps/api/core for explicit provider registration.
// Prefer auto-detection (isTauri() path in invoke()) over explicit registration
// unless you need to force Tauri mode or test with a mock provider.

export function createTauriCoreProvider(): CoreProvider {
  return {
    id: "tauri",
    invoke: async <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> => {
      const mod = await import("@tauri-apps/api/core" as string) as TauriCoreModule;
      return mod.invoke<T>(command, args);
    },
    convertFileSrc: (filePath: string, protocol?: string): string => {
      const proto = protocol ?? "asset";
      return `${proto}://localhost${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
    },
    runtimeInfo: {
      id: "tauri",
      platform: "desktop",
      capabilities: {
        events: true,
        fs: true,
        dialog: true,
        window: true,
        task: true,
        convertFileSrc: true,
      },
    },
  };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Bootstrap all Tauri adapters at once.
 *
 * Registers the event adapter so that webtau's listen/emit route through
 * Tauri's native IPC event system, ensuring backend-origin events are
 * received by frontend listeners.
 *
 * An optional coreProvider can be passed to override the default Tauri
 * core provider (useful for testing).
 *
 * ```ts
 * import { bootstrapTauri } from "webtau/adapters/tauri";
 * bootstrapTauri();
 * ```
 */
export function bootstrapTauri(coreProvider?: CoreProvider): void {
  registerProvider(coreProvider ?? createTauriCoreProvider());
  setEventAdapter(createTauriEventAdapter());
}
