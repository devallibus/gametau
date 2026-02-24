import { describe, test, expect, beforeEach } from "bun:test";
import { configure, invoke, isTauri } from "./core";

// We're not in Tauri, so isTauri() should be false
describe("isTauri", () => {
  test("returns false outside Tauri", () => {
    expect(isTauri()).toBe(false);
  });
});

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
        capture: (args: unknown) => { received = args; },
      }),
    });
    await invoke("capture", { x: 1, y: 2 });
    expect(received).toEqual({ x: 1, y: 2 });
  });

  test("throws for unknown command", async () => {
    expect(invoke("nonexistent")).rejects.toThrow("no export named");
  });
});

describe("configure", () => {
  test("throws if invoke called without configure", async () => {
    // Create a fresh module scope would be ideal, but we can test
    // the error path by configuring with a failing loader
    configure({
      loadWasm: async () => {
        throw new Error("load failed");
      },
      onLoadError: () => {}, // suppress console
    });

    expect(invoke("anything")).rejects.toThrow("load failed");
  });
});
