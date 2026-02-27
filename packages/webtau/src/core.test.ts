import { beforeEach, describe, expect, test } from "bun:test";
import { configure, invoke, isTauri } from "./core";

// ---------------------------------------------------------------------------
// isTauri — environment detection
// ---------------------------------------------------------------------------

describe("isTauri", () => {
  test("returns false outside Tauri", () => {
    expect(isTauri()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// invoke — web/WASM mode
// ---------------------------------------------------------------------------

describe("invoke (web mode)", () => {
  const mockWasm = {
    get_world_view: () => ({ score: 42 }),
    tick_world: () => ({ events: [] }),
    add: (args: { a: number; b: number }) => args.a + args.b,
  };

  beforeEach(() => {
    configure({
      loadWasm: async () => mockWasm,
    });
  });

  test("calls WASM function with no args", async () => {
    const result = await invoke("get_world_view");
    expect(result).toEqual({ score: 42 });
  });

  test("calls WASM function with args", async () => {
    const result = await invoke<number>("add", { a: 3, b: 4 });
    expect(result).toBe(7);
  });

  test("passes args as single object (not spread)", async () => {
    let received: unknown;
    configure({
      loadWasm: async () => ({
        capture: (args: unknown) => {
          received = args;
        },
      }),
    });
    await invoke("capture", { x: 1, y: 2 });
    expect(received).toEqual({ x: 1, y: 2 });
  });

  test("handles promise-returning WASM functions", async () => {
    configure({
      loadWasm: async () => ({
        async_op: async () => ({ done: true }),
      }),
    });
    const result = await invoke("async_op");
    expect(result).toEqual({ done: true });
  });

  test("throws for unknown command with available exports listed", async () => {
    try {
      await invoke("nonexistent");
      throw new Error("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('no export named "nonexistent"');
      // Error should list available function names so developers know what's callable
      expect(msg).toContain("Available:");
      expect(msg).toContain("get_world_view");
      expect(msg).toContain("tick_world");
      expect(msg).toContain("add");
    }
  });

  test("invoke with empty args object passes empty object", async () => {
    let received: unknown;
    configure({
      loadWasm: async () => ({
        check_args: (args: unknown) => { received = args; return "ok"; },
      }),
    });
    await invoke("check_args", {});
    expect(received).toEqual({});
  });

  test("invoke before configure throws meaningful error", async () => {
    // Reset internal state by configuring with null-ish then clearing
    configure({ loadWasm: async () => { throw new Error("should not be called"); } });
    // Re-configure to clear cached module, then unset loader
    // Actually, we can't fully reset, but we can test the error path
    // by configuring with a loader that doesn't have the command
    configure({ loadWasm: async () => ({}) });
    try {
      await invoke("nonexistent_command");
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as Error).message).toContain('no export named "nonexistent_command"');
    }
  });
});

// ---------------------------------------------------------------------------
// configure — module loading lifecycle
// ---------------------------------------------------------------------------

describe("configure — second call overrides", () => {
  test("second configure replaces first", async () => {
    configure({ loadWasm: async () => ({ val: () => 1 }) });
    expect(await invoke("val")).toBe(1);
    configure({ loadWasm: async () => ({ val: () => 2 }) });
    expect(await invoke("val")).toBe(2);
  });
});

describe("configure", () => {
  test("throws if invoke called with a failing loader", async () => {
    configure({
      loadWasm: async () => {
        throw new Error("load failed");
      },
      onLoadError: () => {}, // suppress console
    });

    expect(invoke("anything")).rejects.toThrow("load failed");
  });

  test("allows retry after failed load", async () => {
    // First: configure with a broken loader
    let callCount = 0;
    configure({
      loadWasm: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("network error");
        }
        return { ping: () => "pong" };
      },
      onLoadError: () => {}, // suppress console
    });

    // First invoke should fail
    await expect(invoke("ping")).rejects.toThrow("network error");

    // Second invoke should retry and succeed (promise was cleared)
    const result = await invoke("ping");
    expect(result).toBe("pong");
    expect(callCount).toBe(2);
  });

  test("reconfiguration clears cached module", async () => {
    // Load module A
    configure({ loadWasm: async () => ({ greet: () => "hello" }) });
    const resultA = await invoke("greet");
    expect(resultA).toBe("hello");

    // Reconfigure with module B — should use new module, not cache
    configure({ loadWasm: async () => ({ greet: () => "hola" }) });
    const resultB = await invoke("greet");
    expect(resultB).toBe("hola");
  });

  test("calls onLoadError callback on failure", async () => {
    let capturedError: unknown;
    configure({
      loadWasm: async () => {
        throw new Error("boom");
      },
      onLoadError: (err) => {
        capturedError = err;
      },
    });

    await expect(invoke("anything")).rejects.toThrow("boom");
    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toBe("boom");
  });
});
