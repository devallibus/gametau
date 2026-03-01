import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { setEventAdapter } from "../event";
import { listen, emit } from "../event";
import type { EventAdapter } from "../provider";
import type { EventCallback } from "../event";

// ---------------------------------------------------------------------------
// In-memory adapter for parity contract testing
// ---------------------------------------------------------------------------

function createInMemoryAdapter(): EventAdapter {
  const listeners = new Map<string, Map<number, { handler: EventCallback<unknown> }>>();
  let nextId = 1;

  return {
    async listen<T>(event: string, handler: EventCallback<T>): Promise<() => void> {
      const id = nextId++;
      const eventListeners =
        listeners.get(event) ?? new Map<number, { handler: EventCallback<unknown> }>();
      eventListeners.set(id, { handler: handler as EventCallback<unknown> });
      listeners.set(event, eventListeners);
      return () => {
        const map = listeners.get(event);
        if (map) {
          map.delete(id);
          if (map.size === 0) listeners.delete(event);
        }
      };
    },
    async emit<T>(event: string, payload?: T): Promise<void> {
      const eventListeners = listeners.get(event);
      if (!eventListeners) return;
      for (const [id, { handler }] of eventListeners) {
        handler({ event, id, payload: payload as unknown });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Parity contract: ordered delivery
// ---------------------------------------------------------------------------

describe("EventAdapter parity contract — ordered delivery", () => {
  beforeEach(() => {
    setEventAdapter(createInMemoryAdapter());
  });

  afterEach(() => {
    setEventAdapter(null);
  });

  test("multiple emits arrive in emission order", async () => {
    const received: number[] = [];
    const unlisten = await listen<{ seq: number }>("parity:order", (e) => {
      received.push(e.payload.seq);
    });

    await emit("parity:order", { seq: 1 });
    await emit("parity:order", { seq: 2 });
    await emit("parity:order", { seq: 3 });
    unlisten();

    expect(received).toEqual([1, 2, 3]);
  });

  test("all registered listeners receive the same payload", async () => {
    const resultsA: number[] = [];
    const resultsB: number[] = [];

    const unlistenA = await listen<{ val: number }>("parity:multi", (e) => {
      resultsA.push(e.payload.val);
    });
    const unlistenB = await listen<{ val: number }>("parity:multi", (e) => {
      resultsB.push(e.payload.val);
    });

    await emit("parity:multi", { val: 42 });
    unlistenA();
    unlistenB();

    expect(resultsA).toEqual([42]);
    expect(resultsB).toEqual([42]);
  });

  test("unlisten stops future deliveries for that listener only", async () => {
    const receivedA: number[] = [];
    const receivedB: number[] = [];

    const unlistenA = await listen<{ n: number }>("parity:unlisten", (e) => {
      receivedA.push(e.payload.n);
    });
    const unlistenB = await listen<{ n: number }>("parity:unlisten", (e) => {
      receivedB.push(e.payload.n);
    });

    await emit("parity:unlisten", { n: 1 });
    unlistenA();
    await emit("parity:unlisten", { n: 2 });
    unlistenB();

    expect(receivedA).toEqual([1]);
    expect(receivedB).toEqual([1, 2]);
  });

  test("unlisten is idempotent — calling it twice does not throw", async () => {
    const unlisten = await listen("parity:idempotent", () => {});
    expect(() => {
      unlisten();
      unlisten();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tauri adapter structure tests (without an actual Tauri runtime)
// ---------------------------------------------------------------------------

describe("createTauriEventAdapter — structure", () => {
  test("adapter exposes listen and emit methods", async () => {
    const { createTauriEventAdapter } = await import("./tauri");
    const adapter = createTauriEventAdapter();
    expect(typeof adapter.listen).toBe("function");
    expect(typeof adapter.emit).toBe("function");
  });

  test("createTauriCoreProvider returns correct id", async () => {
    const { createTauriCoreProvider } = await import("./tauri");
    const provider = createTauriCoreProvider();
    expect(provider.id).toBe("tauri");
    expect(typeof provider.invoke).toBe("function");
    expect(typeof provider.convertFileSrc).toBe("function");
  });

  test("createTauriCoreProvider convertFileSrc applies asset protocol", async () => {
    const { createTauriCoreProvider } = await import("./tauri");
    const provider = createTauriCoreProvider();
    const url = provider.convertFileSrc("/sprites/hero.png", "asset");
    expect(url).toContain("asset://");
    expect(url).toContain("/sprites/hero.png");
  });

  test("createTauriCoreProvider convertFileSrc defaults to asset protocol", async () => {
    const { createTauriCoreProvider } = await import("./tauri");
    const provider = createTauriCoreProvider();
    const url = provider.convertFileSrc("/data/save.json");
    expect(url).toContain("asset://localhost/data/save.json");
  });

  test("bootstrapTauri is a function", async () => {
    const { bootstrapTauri } = await import("./tauri");
    expect(typeof bootstrapTauri).toBe("function");
  });
});
