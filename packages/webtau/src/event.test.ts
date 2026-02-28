import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { emit, emitTo, listen, once, setEventAdapter } from "./event";
import type { EventAdapter } from "./provider";

const originalWindow = (globalThis as { window?: unknown }).window;
const originalCustomEvent = (globalThis as { CustomEvent?: unknown }).CustomEvent;

beforeEach(() => {
  const target = new EventTarget();
  (globalThis as { window?: unknown }).window = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };

  if (typeof globalThis.CustomEvent === "undefined") {
    class PolyfillCustomEvent<T = unknown> extends Event {
      readonly detail?: T;

      constructor(type: string, init?: { detail?: T }) {
        super(type);
        this.detail = init?.detail;
      }
    }
    (globalThis as { CustomEvent?: unknown }).CustomEvent = PolyfillCustomEvent as unknown;
  }
});

afterEach(() => {
  setEventAdapter(null);
  (globalThis as { window?: unknown }).window = originalWindow;
  (globalThis as { CustomEvent?: unknown }).CustomEvent = originalCustomEvent;
});

describe("webtau/event", () => {
  test("listen + emit passes payload through CustomEvent bridge", async () => {
    const received: number[] = [];
    const unlisten = await listen<{ score: number }>("game:update", (event) => {
      received.push(event.payload.score);
    });

    await emit("game:update", { score: 7 });
    unlisten();

    expect(received).toEqual([7]);
  });

  test("once triggers only once", async () => {
    let count = 0;
    await once("game:once", () => {
      count++;
    });

    await emit("game:once", { tick: 1 });
    await emit("game:once", { tick: 2 });

    expect(count).toBe(1);
  });

  test("emitTo routes to the same event channel in web mode", async () => {
    let payloadValue = "";
    const unlisten = await listen<{ value: string }>("chat:message", (event) => {
      payloadValue = event.payload.value;
    });

    await emitTo("ignored-target", "chat:message", { value: "hello" });
    unlisten();

    expect(payloadValue).toBe("hello");
  });

  test("unlisten stops further notifications", async () => {
    let count = 0;
    const unlisten = await listen("game:stop", () => {
      count++;
    });

    await emit("game:stop");
    unlisten();
    await emit("game:stop");

    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// EventAdapter — adapter override
// ---------------------------------------------------------------------------

describe("setEventAdapter", () => {
  test("adapter overrides listen and emit", async () => {
    const handlers = new Map<string, Function>();

    const adapter: EventAdapter = {
      listen: async (event, handler) => {
        handlers.set(event, handler);
        return () => { handlers.delete(event); };
      },
      emit: async (event, payload) => {
        const handler = handlers.get(event);
        if (handler) handler({ event, id: 0, payload });
      },
    };

    setEventAdapter(adapter);

    const received: number[] = [];
    const unlisten = await listen<{ val: number }>("test:event", (e) => {
      received.push(e.payload.val);
    });

    await emit("test:event", { val: 42 });
    expect(received).toEqual([42]);

    unlisten();
    await emit("test:event", { val: 99 });
    // After unlisten, handler was removed from adapter
    expect(received).toEqual([42]);
  });

  test("clearing adapter restores default behavior", async () => {
    let adapterCalled = false;
    setEventAdapter({
      listen: async () => {
        adapterCalled = true;
        return () => {};
      },
      emit: async () => { adapterCalled = true; },
    });

    await listen("x", () => {});
    expect(adapterCalled).toBe(true);

    adapterCalled = false;
    setEventAdapter(null);

    // Should use default CustomEvent path, not adapter
    const received: unknown[] = [];
    const unlisten = await listen("y", (e) => { received.push(e.payload); });
    await emit("y", "hello");
    unlisten();

    expect(adapterCalled).toBe(false);
    expect(received).toEqual(["hello"]);
  });
});
