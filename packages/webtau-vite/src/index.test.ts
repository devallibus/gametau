import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

// --- Module mocks (hoisted by Bun before imports) ---

mock.module("child_process", () => ({
  execSync: mock(() => "wasm-pack 0.12.0"),
  spawnSync: mock(() => ({ status: 0, error: null, stderr: null, stdout: null })),
}));

mock.module("fs", () => ({
  existsSync: mock(() => true),
  readdirSync: mock(() => ["foo_bg.wasm", "package.json"]),
}));

mock.module("chokidar", () => {
  const watcher: any = {
    on: mock((_event: string, _handler: Function) => watcher),
    close: mock(),
  };
  return { watch: mock(() => watcher) };
});

// --- Imports (receive mocked versions) ---

import webtauVite from "./index";
import { spawnSync, execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { watch } from "chokidar";

// Grab shared watcher reference for cleanup between tests
const _watcher = (watch as any)();
(watch as any).mockClear();

// --- Helpers ---

function createPlugin(opts = {}, command: "serve" | "build" = "serve") {
  const plugin = webtauVite(opts);
  (plugin.configResolved as Function)({ root: "/fake/project", command });
  return plugin;
}

function resetMocks() {
  (spawnSync as any).mockClear();
  (spawnSync as any).mockImplementation(() => ({
    status: 0, error: null, stderr: null, stdout: null,
  }));
  (execSync as any).mockClear();
  (execSync as any).mockImplementation(() => "wasm-pack 0.12.0");
  (existsSync as any).mockClear();
  (existsSync as any).mockImplementation(() => true);
  (readdirSync as any).mockClear();
  (readdirSync as any).mockImplementation(() => ["foo_bg.wasm", "package.json"]);
  (watch as any).mockClear();
  _watcher.on.mockClear();
  _watcher.close.mockClear();
}

// --- Tests ---

describe("webtauVite plugin", () => {
  const originalEnv = process.env.TAURI_ENV_PLATFORM;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TAURI_ENV_PLATFORM;
    } else {
      process.env.TAURI_ENV_PLATFORM = originalEnv;
    }
  });

  test("returns a plugin with correct name", () => {
    const plugin = webtauVite();
    expect(plugin.name).toBe("webtau-vite");
  });

  test("enforces pre order", () => {
    const plugin = webtauVite();
    expect(plugin.enforce).toBe("pre");
  });

  test("resolveId aliases @tauri-apps/api/core in web mode", () => {
    delete process.env.TAURI_ENV_PLATFORM;
    const plugin = webtauVite();
    const resolveId = plugin.resolveId as (source: string) => { id: string } | null;
    expect(resolveId("@tauri-apps/api/core")).toEqual({
      id: "webtau/core",
      external: false,
    });
  });

  test("resolveId aliases @tauri-apps/api/window in web mode", () => {
    delete process.env.TAURI_ENV_PLATFORM;
    const plugin = webtauVite();
    const resolveId = plugin.resolveId as (source: string) => { id: string } | null;
    expect(resolveId("@tauri-apps/api/window")).toEqual({
      id: "webtau/window",
      external: false,
    });
  });

  test("resolveId aliases @tauri-apps/api/dpi in web mode", () => {
    delete process.env.TAURI_ENV_PLATFORM;
    const plugin = webtauVite();
    const resolveId = plugin.resolveId as (source: string) => { id: string } | null;
    expect(resolveId("@tauri-apps/api/dpi")).toEqual({
      id: "webtau/dpi",
      external: false,
    });
  });

  test("resolveId returns null for unknown imports", () => {
    delete process.env.TAURI_ENV_PLATFORM;
    const plugin = webtauVite();
    const resolveId = plugin.resolveId as (source: string) => { id: string } | null;
    expect(resolveId("some-other-module")).toBeNull();
  });

  test("resolveId returns null in Tauri mode", () => {
    process.env.TAURI_ENV_PLATFORM = "windows";
    const plugin = webtauVite();
    const resolveId = plugin.resolveId as (source: string) => { id: string } | null;
    expect(resolveId("@tauri-apps/api/core")).toBeNull();
  });
});

describe("buildStart — wasm-pack build", () => {
  const originalEnv = process.env.TAURI_ENV_PLATFORM;

  beforeEach(() => {
    delete process.env.TAURI_ENV_PLATFORM;
    resetMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TAURI_ENV_PLATFORM;
    } else {
      process.env.TAURI_ENV_PLATFORM = originalEnv;
    }
  });

  test("calls spawnSync with correct wasm-pack args", () => {
    const plugin = createPlugin({}, "serve");
    const ctx = { error: mock(), warn: mock() };
    (plugin.buildStart as Function).call(ctx);

    const wasmPackCall = (spawnSync as any).mock.calls.find(
      (c: any[]) => c[0] === "wasm-pack",
    );
    expect(wasmPackCall).toBeDefined();
    expect(wasmPackCall[1]).toContain("build");
    expect(wasmPackCall[1]).toContain("--target");
    expect(wasmPackCall[1]).toContain("web");
    expect(wasmPackCall[1]).toContain("--no-typescript");
  });

  test("wasm-opt discovers actual .wasm filename", () => {
    const plugin = createPlugin({ wasmOpt: true }, "build");
    const ctx = { error: mock(), warn: mock() };
    (plugin.buildStart as Function).call(ctx);

    const wasmOptCall = (spawnSync as any).mock.calls.find(
      (c: any[]) => c[0] === "wasm-opt",
    );
    expect(wasmOptCall).toBeDefined();
    const args: string[] = wasmOptCall[1];
    expect(args.some((a) => a.endsWith("foo_bg.wasm"))).toBe(true);
  });

  test("wasm-opt warns when no .wasm file found", () => {
    (readdirSync as any).mockImplementation(() => []);
    const plugin = createPlugin({ wasmOpt: true }, "build");
    const ctx = { error: mock(), warn: mock() };
    (plugin.buildStart as Function).call(ctx);

    expect(ctx.warn).toHaveBeenCalled();
    const wasmOptCall = (spawnSync as any).mock.calls.find(
      (c: any[]) => c[0] === "wasm-opt",
    );
    expect(wasmOptCall).toBeUndefined();
  });
});

describe("rebuild guard", () => {
  const originalEnv = process.env.TAURI_ENV_PLATFORM;

  beforeEach(() => {
    delete process.env.TAURI_ENV_PLATFORM;
    resetMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TAURI_ENV_PLATFORM;
    } else {
      process.env.TAURI_ENV_PLATFORM = originalEnv;
    }
  });

  test("coalesces multiple changes during build into one follow-up", () => {
    const plugin = createPlugin({}, "serve");
    const mockServer = { ws: { send: mock() } };
    (plugin.configureServer as Function)(mockServer);

    // Extract the change handler registered on the watcher
    const changeCall = _watcher.on.mock.calls.find(
      (c: any[]) => c[0] === "change",
    );
    expect(changeCall).toBeDefined();
    const changeHandler = changeCall[1] as (path: string) => void;

    // Make the first spawnSync call trigger a second file change
    let buildCount = 0;
    (spawnSync as any).mockClear();
    (spawnSync as any).mockImplementation(() => {
      buildCount++;
      if (buildCount === 1) {
        // Simulate a file change arriving mid-build
        changeHandler("src/second.rs");
      }
      return { status: 0, error: null, stderr: null, stdout: null };
    });

    // Trigger the first change
    changeHandler("src/first.rs");

    // Should have built twice: original + one coalesced follow-up
    const wasmPackCalls = (spawnSync as any).mock.calls.filter(
      (c: any[]) => c[0] === "wasm-pack",
    );
    expect(wasmPackCalls).toHaveLength(2);
    expect(mockServer.ws.send).toHaveBeenCalledTimes(2);
  });
});
