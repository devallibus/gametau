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

import { registerProvider } from "../core";
import type { CoreProvider } from "../provider";
import type { EventAdapter } from "../provider";
import type { EventCallback, UnlistenFn } from "../event";
import { setEventAdapter } from "../event";

// ── Event Adapter ───────────────────────────────────────────────────────────
// Wraps @tauri-apps/api/event listen/emit for use as webtau EventAdapter.
// The id field on each dispatched event is the numeric listener id assigned
// by Tauri's own IPC layer (tauriEvent.id).

export function createTauriEventAdapter(): EventAdapter {
  return {
    async listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
      // Dynamic import so @tauri-apps/api is only loaded at runtime in Tauri.
      const mod = await import("@tauri-apps/api/event" as string);
      const unlisten = await (mod.listen as Function)<T>(
        event,
        (tauriEvent: { event: string; id: number; payload: T }) => {
          handler({ event: tauriEvent.event, id: tauriEvent.id, payload: tauriEvent.payload });
        },
      );
      return unlisten as UnlistenFn;
    },

    async emit<T>(event: string, payload?: T): Promise<void> {
      const mod = await import("@tauri-apps/api/event" as string);
      await (mod.emit as Function)(event, payload);
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
      const mod = await import("@tauri-apps/api/core" as string);
      return (mod.invoke as Function)<T>(command, args);
    },
    convertFileSrc: (filePath: string, protocol?: string): string => {
      const proto = protocol ?? "asset";
      return `${proto}://localhost${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
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
