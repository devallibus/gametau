/**
 * webtau/event — Web shim for @tauri-apps/api/event.
 *
 * Uses a CustomEvent bridge in browser environments, with a
 * lightweight in-memory fallback for non-browser test environments.
 *
 * An optional EventAdapter can be set via `setEventAdapter()` to
 * route all event operations through an alternative runtime.
 */

import type { EventAdapter } from "./provider";

export interface Event<T> {
  event: string;
  id: number;
  payload: T;
}

export type EventCallback<T> = (event: Event<T>) => void;
export type UnlistenFn = () => void;

let eventAdapter: EventAdapter | null = null;

/**
 * Set (or clear) an event adapter that overrides listen/emit.
 * Pass `null` to restore default CustomEvent/fallback behavior.
 */
export function setEventAdapter(adapter: EventAdapter | null): void {
  eventAdapter = adapter;
}

interface FallbackListener<T> {
  id: number;
  once: boolean;
  callback: EventCallback<T>;
}

const domListeners = new Map<number, { event: string; listener: EventListener }>();
const fallbackListeners = new Map<string, Map<number, FallbackListener<unknown>>>();
let nextListenerId = 1;

function hasCustomEventBridge(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function" &&
    typeof window.removeEventListener === "function" &&
    typeof window.dispatchEvent === "function" &&
    typeof CustomEvent !== "undefined"
  );
}

function removeFallbackListener(event: string, id: number): void {
  const listeners = fallbackListeners.get(event);
  if (!listeners) return;
  listeners.delete(id);
  if (listeners.size === 0) {
    fallbackListeners.delete(event);
  }
}

function addFallbackListener<T>(
  event: string,
  id: number,
  callback: EventCallback<T>,
  once: boolean,
): UnlistenFn {
  const listeners = fallbackListeners.get(event) ?? new Map<number, FallbackListener<unknown>>();
  listeners.set(id, { id, once, callback: callback as EventCallback<unknown> });
  fallbackListeners.set(event, listeners);

  return () => {
    removeFallbackListener(event, id);
  };
}

function emitFallback<T>(event: string, payload?: T): void {
  const listeners = fallbackListeners.get(event);
  if (!listeners || listeners.size === 0) return;

  const snapshot = Array.from(listeners.values());
  for (const listener of snapshot) {
    (listener.callback as EventCallback<T>)({
      event,
      id: listener.id,
      payload: payload as T,
    });
    if (listener.once) {
      removeFallbackListener(event, listener.id);
    }
  }
}

export async function listen<T>(
  event: string,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  if (eventAdapter) return eventAdapter.listen(event, handler);

  const id = nextListenerId++;

  if (!hasCustomEventBridge()) {
    return addFallbackListener(event, id, handler, false);
  }

  const listener: EventListener = (nativeEvent) => {
    const payload = nativeEvent instanceof CustomEvent ? (nativeEvent.detail as T) : (undefined as T);
    handler({ event, id, payload });
  };

  window.addEventListener(event, listener);
  domListeners.set(id, { event, listener });

  return () => {
    const current = domListeners.get(id);
    if (!current) return;
    window.removeEventListener(current.event, current.listener);
    domListeners.delete(id);
  };
}

export async function once<T>(
  event: string,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  let unlisten: UnlistenFn = () => {};
  unlisten = await listen<T>(event, (payload) => {
    unlisten();
    handler(payload);
  });
  return unlisten;
}

export async function emit<T>(event: string, payload?: T): Promise<void> {
  if (eventAdapter) return eventAdapter.emit(event, payload);

  if (!hasCustomEventBridge()) {
    emitFallback(event, payload);
    return;
  }
  window.dispatchEvent(new CustomEvent(event, { detail: payload }));
}

export async function emitTo<T>(
  _target: string,
  event: string,
  payload?: T,
): Promise<void> {
  await emit(event, payload);
}
