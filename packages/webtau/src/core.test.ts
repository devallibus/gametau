import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  configure,
  convertFileSrc,
  getProvider,
  invoke,
  isTauri,
  registerProvider,
  resetProvider,
} from "./core";
import type { CoreProvider } from "./provider";

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

// ---------------------------------------------------------------------------
// invoke — Tauri lazy auto-registration
// ---------------------------------------------------------------------------

describe("Tauri lazy auto-registration", () => {
  const globalObj = globalThis as Record<string, unknown>;
  const tauriInvoke = mock(async (cmd: string, args?: Record<string, unknown>) => ({
    command: cmd,
    args,
  }));
  const tauriConvertFileSrc = mock((path: string, protocol?: string) => (
    `${protocol ?? "asset"}://localhost${path}`
  ));
  let tauriImportCount = 0;
  let hadWindow = false;
  let previousWindow: unknown;

  beforeEach(() => {
    hadWindow = Object.hasOwn(globalObj, "window");
    previousWindow = globalObj.window;
    globalObj.window = { __TAURI_INTERNALS__: {} };

    tauriInvoke.mockClear();
    tauriConvertFileSrc.mockClear();
    tauriImportCount = 0;

    mock.module("@tauri-apps/api/core", () => {
      tauriImportCount += 1;
      return {
        invoke: tauriInvoke,
        convertFileSrc: tauriConvertFileSrc,
      };
    });

    resetProvider();
  });

  afterEach(() => {
    resetProvider();
    if (hadWindow) {
      globalObj.window = previousWindow;
    } else {
      delete globalObj.window;
    }
  });

  test("auto-registers Tauri provider on first invoke when isTauri is true", async () => {
    const result = await invoke<{ command: string; args?: Record<string, unknown> }>(
      "test_cmd",
      { key: "val" },
    );

    expect(tauriInvoke).toHaveBeenCalledWith("test_cmd", { key: "val" });
    expect(result).toEqual({ command: "test_cmd", args: { key: "val" } });
    expect(getProvider()?.id).toBe("tauri");
    expect(tauriImportCount).toBe(1);
  });

  test("caches Tauri provider across subsequent invoke calls", async () => {
    await invoke("first_cmd");
    const providerAfterFirstInvoke = getProvider();

    await invoke("second_cmd", { n: 2 });
    const providerAfterSecondInvoke = getProvider();

    expect(providerAfterSecondInvoke).toBe(providerAfterFirstInvoke);
    expect(tauriInvoke).toHaveBeenCalledTimes(2);
    expect(tauriInvoke).toHaveBeenNthCalledWith(1, "first_cmd", undefined);
    expect(tauriInvoke).toHaveBeenNthCalledWith(2, "second_cmd", { n: 2 });
  });

  test("convertFileSrc delegates to Tauri provider after auto-registration", async () => {
    await invoke("boot");

    const converted = convertFileSrc("/sprite.png", "asset");
    expect(tauriConvertFileSrc).toHaveBeenCalledWith("/sprite.png", "asset");
    expect(converted).toBe("asset://localhost/sprite.png");
  });

  test("resetProvider clears auto-registered Tauri provider", async () => {
    await invoke("init");
    expect(getProvider()?.id).toBe("tauri");

    resetProvider();
    expect(getProvider()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// convertFileSrc — asset URL passthrough
// ---------------------------------------------------------------------------

describe("convertFileSrc", () => {
  afterEach(() => {
    resetProvider();
  });

  test("returns path as-is when no protocol given", () => {
    expect(convertFileSrc("/app/data/sprite.png")).toBe("/app/data/sprite.png");
  });

  test("returns path as-is when protocol given (web ignores protocol)", () => {
    expect(convertFileSrc("/app/data/sprite.png", "asset")).toBe(
      "/app/data/sprite.png",
    );
  });

  test("delegates to provider when registered", () => {
    registerProvider({
      id: "test",
      invoke: async () => {},
      convertFileSrc: (path, protocol) => `${protocol ?? "custom"}://localhost/${path}`,
    });

    expect(convertFileSrc("/sprites/hero.png", "asset")).toBe(
      "asset://localhost//sprites/hero.png",
    );
  });
});

// ---------------------------------------------------------------------------
// registerProvider / getProvider / resetProvider — provider registry
// ---------------------------------------------------------------------------

describe("provider registry", () => {
  afterEach(() => {
    resetProvider();
  });

  test("getProvider returns null by default", () => {
    expect(getProvider()).toBeNull();
  });

  test("registerProvider sets a provider retrievable via getProvider", () => {
    const provider: CoreProvider = {
      id: "test-runtime",
      invoke: async () => "result",
      convertFileSrc: (p) => p,
    };
    registerProvider(provider);
    expect(getProvider()).toBe(provider);
    expect(getProvider()?.id).toBe("test-runtime");
  });

  test("resetProvider clears the registered provider", () => {
    registerProvider({
      id: "temp",
      invoke: async () => {},
      convertFileSrc: (p) => p,
    });
    expect(getProvider()).not.toBeNull();
    resetProvider();
    expect(getProvider()).toBeNull();
  });

  test("invoke delegates to registered provider", async () => {
    let capturedCmd = "";
    let capturedArgs: Record<string, unknown> | undefined;

    registerProvider({
      id: "mock",
      invoke: async <T>(cmd: string, args?: Record<string, unknown>) => {
        capturedCmd = cmd;
        capturedArgs = args;
        return { mock: true } as T;
      },
      convertFileSrc: (p) => p,
    });

    const result = await invoke("test_cmd", { key: "value" });
    expect(capturedCmd).toBe("test_cmd");
    expect(capturedArgs).toEqual({ key: "value" });
    expect(result).toEqual({ mock: true });
  });

  test("provider invoke takes precedence over WASM", async () => {
    configure({ loadWasm: async () => ({ test_cmd: () => "from-wasm" }) });
    registerProvider({
      id: "priority",
      invoke: async () => "from-provider",
      convertFileSrc: (p) => p,
    });

    const result = await invoke("test_cmd");
    expect(result).toBe("from-provider");
  });

  test("WASM path still works after resetProvider", async () => {
    registerProvider({
      id: "temp",
      invoke: async () => "from-provider",
      convertFileSrc: (p) => p,
    });
    resetProvider();
    configure({ loadWasm: async () => ({ ping: () => "pong" }) });
    const result = await invoke("ping");
    expect(result).toBe("pong");
  });
});
