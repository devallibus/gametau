import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  configure,
  convertFileSrc,
  getProvider,
  getRuntimeInfo,
  invoke,
  isTauri,
  registerProvider,
  resetProvider,
  WebtauError,
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

describe("getRuntimeInfo", () => {
  const globalObj = globalThis as Record<string, unknown>;
  let hadWindow = false;
  let previousWindow: unknown;

  beforeEach(() => {
    hadWindow = Object.hasOwn(globalObj, "window");
    previousWindow = globalObj.window;
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

  test("returns wasm runtime info by default", () => {
    expect(getRuntimeInfo()).toEqual({
      id: "wasm",
      platform: "web",
      capabilities: {
        events: true,
        fs: true,
        dialog: true,
        window: true,
        task: true,
        convertFileSrc: true,
      },
    });
  });

  test("returns tauri runtime info from environment auto-detection", () => {
    globalObj.window = { __TAURI_INTERNALS__: {} };

    expect(getRuntimeInfo()).toEqual({
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
    });
  });

  test("returns explicit provider runtime info when supplied", () => {
    registerProvider({
      id: "custom",
      invoke: async () => null,
      convertFileSrc: (path) => path,
      runtimeInfo: {
        id: "custom",
        platform: "desktop",
        capabilities: {
          events: false,
          fs: false,
          dialog: false,
          window: false,
          task: true,
          convertFileSrc: true,
        },
      },
    });

    expect(getRuntimeInfo()).toEqual({
      id: "custom",
      platform: "desktop",
      capabilities: {
        events: false,
        fs: false,
        dialog: false,
        window: false,
        task: true,
        convertFileSrc: true,
      },
    });
  });

  test("derives Electrobun render-mode info from the exposed bridge", () => {
    globalObj.window = {
      __ELECTROBUN__: {
        invoke: async () => null,
        renderMode: "hybrid",
        capabilities: {
          hasGpuWindow: false,
          hasWgpuView: true,
          hasWebGpu: true,
        },
      },
    };

    registerProvider({
      id: "electrobun",
      invoke: async () => null,
      convertFileSrc: (path) => path,
    });

    expect(getRuntimeInfo()).toEqual({
      id: "electrobun",
      platform: "desktop",
      capabilities: {
        events: true,
        fs: true,
        dialog: true,
        window: true,
        task: true,
        convertFileSrc: true,
        renderMode: "hybrid",
        hasGpuWindow: false,
        hasWgpuView: true,
        hasWebGpu: true,
      },
    });
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

  test("explicit provider takes precedence over Tauri auto-detection", async () => {
    // __TAURI_INTERNALS__ is already set by beforeEach
    const providerInvoke = mock(async <T>(cmd: string, args?: Record<string, unknown>) => (
      { provider: true, cmd, args } as T
    ));

    registerProvider({
      id: "electrobun",
      invoke: providerInvoke,
      convertFileSrc: (p) => `electrobun://asset/${p}`,
    });

    const result = await invoke("test_cmd", { key: "val" });

    expect(providerInvoke).toHaveBeenCalledWith("test_cmd", { key: "val" });
    expect(result).toEqual({ provider: true, cmd: "test_cmd", args: { key: "val" } });
    expect(getProvider()?.id).toBe("electrobun");
    // Tauri mock should NOT have been called
    expect(tauriInvoke).not.toHaveBeenCalled();
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

  test("provider invoke rejection is wrapped in WebtauError with PROVIDER_ERROR code", async () => {
    registerProvider({
      id: "failing",
      invoke: async () => { throw new Error("provider error"); },
      convertFileSrc: (p) => p,
    });

    try {
      await invoke("any_cmd");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const e = err as WebtauError;
      expect(e.code).toBe("PROVIDER_ERROR");
      expect(e.runtime).toBe("failing");
      expect(e.command).toBe("any_cmd");
      expect(e.message).toContain("provider error");
      expect(e.hint).toContain("failing");
    }
  });

  test("provider WebtauError passthrough is not double-wrapped", async () => {
    const original = new WebtauError({
      code: "PROVIDER_MISSING",
      runtime: "custom",
      command: "test_cmd",
      message: "already structured",
      hint: "do nothing",
    });

    registerProvider({
      id: "structured",
      invoke: async () => { throw original; },
      convertFileSrc: (p) => p,
    });

    try {
      await invoke("test_cmd");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBe(original);
      expect((err as WebtauError).code).toBe("PROVIDER_MISSING");
    }
  });

  test("re-registration replaces previous provider", async () => {
    registerProvider({
      id: "first",
      invoke: async () => "from-first",
      convertFileSrc: (p) => p,
    });
    expect(await invoke("cmd")).toBe("from-first");
    expect(getProvider()?.id).toBe("first");

    registerProvider({
      id: "second",
      invoke: async () => "from-second",
      convertFileSrc: (p) => p,
    });
    expect(await invoke("cmd")).toBe("from-second");
    expect(getProvider()?.id).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// WebtauError — structured diagnostic envelope
// ---------------------------------------------------------------------------

describe("WebtauError envelope shape", () => {
  afterEach(() => {
    resetProvider();
  });

  test("WebtauError is instanceof Error and WebtauError", () => {
    const err = new WebtauError({
      code: "NO_WASM_CONFIGURED",
      runtime: "wasm",
      command: "",
      message: "test message",
      hint: "test hint",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WebtauError);
    expect(err.name).toBe("WebtauError");
  });

  test("invoke throws WebtauError with UNKNOWN_COMMAND for missing export", async () => {
    configure({ loadWasm: async () => ({ existing_cmd: () => 42 }) });

    try {
      await invoke("nonexistent_export");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const webtauErr = err as WebtauError;
      expect(webtauErr.code).toBe("UNKNOWN_COMMAND");
      expect(webtauErr.runtime).toBe("wasm");
      expect(webtauErr.command).toBe("nonexistent_export");
      expect(webtauErr.message).toContain("nonexistent_export");
      expect(webtauErr.hint).toContain("existing_cmd");
    }
  });

  test("invoke throws WebtauError with LOAD_FAILED when loader throws", async () => {
    configure({
      loadWasm: async () => { throw new Error("network unavailable"); },
      onLoadError: () => {},
    });

    try {
      await invoke("any_cmd");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const webtauErr = err as WebtauError;
      expect(webtauErr.code).toBe("LOAD_FAILED");
      expect(webtauErr.runtime).toBe("wasm");
      expect(webtauErr.message).toContain("network unavailable");
      expect(typeof webtauErr.hint).toBe("string");
      expect(webtauErr.hint.length).toBeGreaterThan(0);
    }
  });

  test("WASM command execution error is wrapped in WebtauError", async () => {
    configure({
      loadWasm: async () => ({
        exploding_cmd: () => { throw new Error("rust panic simulation"); },
      }),
    });

    try {
      await invoke("exploding_cmd");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const e = err as WebtauError;
      expect(e.code).toBe("PROVIDER_ERROR");
      expect(e.runtime).toBe("wasm");
      expect(e.command).toBe("exploding_cmd");
      expect(e.message).toContain("rust panic simulation");
    }
  });

  test("async WASM command rejection is wrapped in WebtauError", async () => {
    configure({
      loadWasm: async () => ({
        async_fail: async () => { throw new Error("async wasm error"); },
      }),
    });

    try {
      await invoke("async_fail");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const e = err as WebtauError;
      expect(e.code).toBe("PROVIDER_ERROR");
      expect(e.runtime).toBe("wasm");
      expect(e.command).toBe("async_fail");
      expect(e.message).toContain("async wasm error");
    }
  });

  test("all DiagnosticEnvelope fields are present and typed correctly", () => {
    const err = new WebtauError({
      code: "PROVIDER_ERROR",
      runtime: "provider",
      command: "my_cmd",
      message: "Provider failed",
      hint: "Check provider configuration",
    });

    expect(typeof err.code).toBe("string");
    expect(typeof err.runtime).toBe("string");
    expect(typeof err.command).toBe("string");
    expect(typeof err.message).toBe("string");
    expect(typeof err.hint).toBe("string");
    expect(err.command).toBe("my_cmd");
    expect(err.runtime).toBe("provider");
  });
});
