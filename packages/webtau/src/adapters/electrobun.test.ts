import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { registerProvider, resetProvider } from "../core";
import type { CoreProvider } from "../provider";

// ── Globals required by window/event/dialog modules ─────────────────────────

beforeAll(() => {
  if (typeof globalThis.document === "undefined") {
    (globalThis as any).document = {
      title: "",
      fullscreenElement: null,
      documentElement: { requestFullscreen: async () => {} },
      exitFullscreen: async () => {},
      body: null,
    };
  }
  if (typeof globalThis.screen === "undefined") {
    (globalThis as any).screen = { width: 1920, height: 1080 };
  }
  if (typeof globalThis.window === "undefined") {
    (globalThis as any).window = {
      innerWidth: 1280,
      innerHeight: 720,
      outerWidth: 1300,
      outerHeight: 750,
      devicePixelRatio: 1,
      resizeTo: () => {},
      moveTo: () => {},
      close: () => {},
    };
  }
});

// ── Mock invoke provider ────────────────────────────────────────────────────

/** Tracks all invoke calls made through the mock provider. */
const invokeCalls: Array<{ command: string; args?: Record<string, unknown> }> = [];

/** Configurable return values keyed by command string. */
const invokeReturns = new Map<string, unknown>();

/** Configurable error responses keyed by command string. */
const invokeErrors = new Map<string, Error>();

const mockInvoke = mock(
  async <T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> => {
    invokeCalls.push({ command, args });
    const error = invokeErrors.get(command);
    if (error) {
      throw error;
    }
    return (invokeReturns.get(command) ?? null) as T;
  },
);

const mockProvider: CoreProvider = {
  id: "electrobun-test",
  invoke: mockInvoke,
  convertFileSrc: (path) => `electrobun://asset/${path.replace(/^\/+/, "")}`,
};

// ── Dynamic imports (after globals) ─────────────────────────────────────────

let createElectrobunWindowAdapter: typeof import("./electrobun").createElectrobunWindowAdapter;
let createElectrobunEventAdapter: typeof import("./electrobun").createElectrobunEventAdapter;
let createElectrobunFsAdapter: typeof import("./electrobun").createElectrobunFsAdapter;
let createElectrobunDialogAdapter: typeof import("./electrobun").createElectrobunDialogAdapter;
let bootstrapElectrobun: typeof import("./electrobun").bootstrapElectrobun;
let dispatchElectrobunEvent: typeof import("./electrobun").dispatchElectrobunEvent;
let createElectrobunCoreProvider: typeof import("./electrobun").createElectrobunCoreProvider;

let getCurrentWindow: typeof import("../window").getCurrentWindow;
let setWindowAdapter: typeof import("../window").setWindowAdapter;
let listen: typeof import("../event").listen;
let emit: typeof import("../event").emit;
let setEventAdapter: typeof import("../event").setEventAdapter;

let writeTextFile: typeof import("../fs").writeTextFile;
let readTextFile: typeof import("../fs").readTextFile;
let exists: typeof import("../fs").exists;
let setFsAdapter: typeof import("../fs").setFsAdapter;

let message: typeof import("../dialog").message;
let ask: typeof import("../dialog").ask;
let setDialogAdapter: typeof import("../dialog").setDialogAdapter;

beforeAll(async () => {
  const electrobunMod = await import("./electrobun");
  createElectrobunWindowAdapter = electrobunMod.createElectrobunWindowAdapter;
  createElectrobunEventAdapter = electrobunMod.createElectrobunEventAdapter;
  createElectrobunFsAdapter = electrobunMod.createElectrobunFsAdapter;
  createElectrobunDialogAdapter = electrobunMod.createElectrobunDialogAdapter;
  bootstrapElectrobun = electrobunMod.bootstrapElectrobun;
  dispatchElectrobunEvent = electrobunMod.dispatchElectrobunEvent;
  createElectrobunCoreProvider = electrobunMod.createElectrobunCoreProvider;

  const windowMod = await import("../window");
  getCurrentWindow = windowMod.getCurrentWindow;
  setWindowAdapter = windowMod.setWindowAdapter;

  const eventMod = await import("../event");
  listen = eventMod.listen;
  emit = eventMod.emit;
  setEventAdapter = eventMod.setEventAdapter;

  const fsMod = await import("../fs");
  writeTextFile = fsMod.writeTextFile;
  readTextFile = fsMod.readTextFile;
  exists = fsMod.exists;
  setFsAdapter = fsMod.setFsAdapter;

  const dialogMod = await import("../dialog");
  message = dialogMod.message;
  ask = dialogMod.ask;
  setDialogAdapter = dialogMod.setDialogAdapter;
});

beforeEach(() => {
  invokeCalls.length = 0;
  invokeReturns.clear();
  invokeErrors.clear();
  mockInvoke.mockClear();
  registerProvider(mockProvider);
});

afterEach(() => {
  setWindowAdapter(null);
  setEventAdapter(null);
  setFsAdapter(null);
  setDialogAdapter(null);
  resetProvider();
});

// ═══════════════════════════════════════════════════════════════════════════
// Window Adapter
// ═══════════════════════════════════════════════════════════════════════════

describe("createElectrobunWindowAdapter", () => {
  test("isFullscreen invokes correct command", async () => {
    invokeReturns.set("plugin:electrobun|window_is_fullscreen", true);
    const adapter = createElectrobunWindowAdapter();
    const result = await adapter.isFullscreen();
    expect(result).toBe(true);
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_is_fullscreen");
  });

  test("setFullscreen passes fullscreen arg", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.setFullscreen(true);
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|window_set_fullscreen",
      args: { fullscreen: true },
    });
  });

  test("innerSize returns size from backend", async () => {
    invokeReturns.set("plugin:electrobun|window_inner_size", {
      width: 800, height: 600, type: "Physical",
    });
    const adapter = createElectrobunWindowAdapter();
    const size = await adapter.innerSize();
    expect(size).toEqual({ width: 800, height: 600, type: "Physical" });
  });

  test("outerSize returns size from backend", async () => {
    invokeReturns.set("plugin:electrobun|window_outer_size", {
      width: 820, height: 630, type: "Physical",
    });
    const adapter = createElectrobunWindowAdapter();
    const size = await adapter.outerSize();
    expect(size).toEqual({ width: 820, height: 630, type: "Physical" });
  });

  test("setSize forwards size object", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.setSize({ width: 1024, height: 768, type: "Logical" });
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|window_set_size",
      args: { width: 1024, height: 768, type: "Logical" },
    });
  });

  test("title returns string from backend", async () => {
    invokeReturns.set("plugin:electrobun|window_title", "My Game");
    const adapter = createElectrobunWindowAdapter();
    expect(await adapter.title()).toBe("My Game");
  });

  test("setTitle passes title arg", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.setTitle("New Title");
    expect(invokeCalls[0].args).toEqual({ title: "New Title" });
  });

  test("close invokes window_close", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.close();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_close");
  });

  test("minimize invokes window_minimize", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.minimize();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_minimize");
  });

  test("unminimize invokes window_unminimize", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.unminimize();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_unminimize");
  });

  test("maximize invokes window_maximize", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.maximize();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_maximize");
  });

  test("isMaximized invokes window_is_maximized", async () => {
    invokeReturns.set("plugin:electrobun|window_is_maximized", false);
    const adapter = createElectrobunWindowAdapter();
    expect(await adapter.isMaximized()).toBe(false);
  });

  test("show invokes window_show", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.show();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_show");
  });

  test("hide invokes window_hide", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.hide();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_hide");
  });

  test("setDecorations passes decorations arg", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.setDecorations(false);
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|window_set_decorations",
      args: { decorations: false },
    });
  });

  test("center invokes window_center", async () => {
    const adapter = createElectrobunWindowAdapter();
    await adapter.center();
    expect(invokeCalls[0].command).toBe("plugin:electrobun|window_center");
  });

  test("currentMonitor returns monitor info from backend", async () => {
    const monitor = {
      name: "HDMI-1",
      size: { width: 1920, height: 1080 },
      position: { x: 0, y: 0 },
      scaleFactor: 2,
    };
    invokeReturns.set("plugin:electrobun|window_current_monitor", monitor);
    const adapter = createElectrobunWindowAdapter();
    expect(await adapter.currentMonitor()).toEqual(monitor);
  });

  test("scaleFactor returns number from backend", async () => {
    invokeReturns.set("plugin:electrobun|window_scale_factor", 1.5);
    const adapter = createElectrobunWindowAdapter();
    expect(await adapter.scaleFactor()).toBe(1.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Event Adapter
// ═══════════════════════════════════════════════════════════════════════════

describe("createElectrobunEventAdapter", () => {
  test("listen invokes event_listen and returns unlisten function", async () => {
    invokeReturns.set("plugin:electrobun|event_listen", 42);
    const adapter = createElectrobunEventAdapter();
    const handler = mock(() => {});
    const unlisten = await adapter.listen("game:update", handler);

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|event_listen",
      args: { event: "game:update" },
    });
    expect(typeof unlisten).toBe("function");
  });

  test("unlisten calls event_unlisten with listener ID", async () => {
    invokeReturns.set("plugin:electrobun|event_listen", 7);
    const adapter = createElectrobunEventAdapter();
    const unlisten = await adapter.listen("test", () => {});

    invokeCalls.length = 0;
    unlisten();

    // Give the async invoke a tick to fire
    await new Promise((r) => setTimeout(r, 10));
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|event_unlisten",
      args: { listenerId: 7 },
    });
  });

  test("emit invokes event_emit with event and payload", async () => {
    const adapter = createElectrobunEventAdapter();
    await adapter.emit("game:score", { points: 100 });

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|event_emit",
      args: { event: "game:score", payload: { points: 100 } },
    });
  });

  test("emit without payload passes undefined", async () => {
    const adapter = createElectrobunEventAdapter();
    await adapter.emit("game:ping");

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|event_emit",
      args: { event: "game:ping", payload: undefined },
    });
  });

  test("dispatchElectrobunEvent delivers to registered handler", async () => {
    invokeReturns.set("plugin:electrobun|event_listen", 99);
    const adapter = createElectrobunEventAdapter();
    const received: unknown[] = [];
    await adapter.listen("notify", (e) => {
      received.push(e.payload);
    });

    dispatchElectrobunEvent(99, "notify", { msg: "hello" });
    expect(received).toEqual([{ msg: "hello" }]);
  });

  test("dispatchElectrobunEvent is a no-op for unknown listener ID", () => {
    // Should not throw
    dispatchElectrobunEvent(999, "unknown", "data");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Filesystem Adapter
// ═══════════════════════════════════════════════════════════════════════════

describe("createElectrobunFsAdapter", () => {
  test("writeTextFile invokes fs_write_text_file", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.writeTextFile("/data/save.json", '{"score":42}');

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_write_text_file",
      args: { path: "/data/save.json", contents: '{"score":42}' },
    });
  });

  test("readTextFile returns string from backend", async () => {
    invokeReturns.set("plugin:electrobun|fs_read_text_file", "file contents");
    const adapter = createElectrobunFsAdapter();
    expect(await adapter.readTextFile("/data/test.txt")).toBe("file contents");
  });

  test("writeFile serializes Uint8Array as number[]", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.writeFile("/data/bin", new Uint8Array([1, 2, 3]));

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_write_file",
      args: { path: "/data/bin", data: [1, 2, 3] },
    });
  });

  test("writeFile serializes ArrayBuffer as number[]", async () => {
    const adapter = createElectrobunFsAdapter();
    const buffer = new Uint8Array([10, 20]).buffer;
    await adapter.writeFile("/data/buf", buffer);

    expect(invokeCalls[0].args).toEqual({ path: "/data/buf", data: [10, 20] });
  });

  test("writeFile passes number[] directly", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.writeFile("/data/arr", [5, 6, 7]);

    expect(invokeCalls[0].args).toEqual({ path: "/data/arr", data: [5, 6, 7] });
  });

  test("writeFile serializes string as number[]", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.writeFile("/data/str", "AB");

    // "AB" -> UTF-8 -> [65, 66]
    expect(invokeCalls[0].args).toEqual({ path: "/data/str", data: [65, 66] });
  });

  test("readFile returns Uint8Array from backend number[]", async () => {
    invokeReturns.set("plugin:electrobun|fs_read_file", [4, 5, 6]);
    const adapter = createElectrobunFsAdapter();
    const result = await adapter.readFile("/data/bin");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([4, 5, 6]);
  });

  test("exists invokes fs_exists", async () => {
    invokeReturns.set("plugin:electrobun|fs_exists", true);
    const adapter = createElectrobunFsAdapter();
    expect(await adapter.exists("/data/file")).toBe(true);
    expect(invokeCalls[0].args).toEqual({ path: "/data/file" });
  });

  test("mkdir passes recursive option", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.mkdir("/data/nested", { recursive: true });

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_mkdir",
      args: { path: "/data/nested", recursive: true },
    });
  });

  test("mkdir defaults recursive to false", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.mkdir("/data/dir");

    expect(invokeCalls[0].args).toEqual({ path: "/data/dir", recursive: false });
  });

  test("readDir passes recursive option", async () => {
    const entries = [
      { path: "/data/a.txt", name: "a.txt", isFile: true, isDirectory: false },
    ];
    invokeReturns.set("plugin:electrobun|fs_read_dir", entries);
    const adapter = createElectrobunFsAdapter();
    const result = await adapter.readDir("/data", { recursive: true });

    expect(result).toEqual(entries);
    expect(invokeCalls[0].args).toEqual({ path: "/data", recursive: true });
  });

  test("remove passes recursive option", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.remove("/data/old", { recursive: true });

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_remove",
      args: { path: "/data/old", recursive: true },
    });
  });

  test("copyFile invokes fs_copy_file", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.copyFile("/data/src.txt", "/data/dst.txt");

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_copy_file",
      args: { fromPath: "/data/src.txt", toPath: "/data/dst.txt" },
    });
  });

  test("rename invokes fs_rename", async () => {
    const adapter = createElectrobunFsAdapter();
    await adapter.rename("/data/old.txt", "/data/new.txt");

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|fs_rename",
      args: { oldPath: "/data/old.txt", newPath: "/data/new.txt" },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dialog Adapter
// ═══════════════════════════════════════════════════════════════════════════

describe("createElectrobunDialogAdapter", () => {
  test("message invokes dialog_message", async () => {
    const adapter = createElectrobunDialogAdapter();
    await adapter.message("Game saved!", { title: "Info", okLabel: "OK" });

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|dialog_message",
      args: { text: "Game saved!", title: "Info", okLabel: "OK" },
    });
  });

  test("message with no options passes undefined fields", async () => {
    const adapter = createElectrobunDialogAdapter();
    await adapter.message("Hello");

    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|dialog_message",
      args: { text: "Hello", title: undefined, okLabel: undefined },
    });
  });

  test("ask invokes dialog_ask and returns boolean", async () => {
    invokeReturns.set("plugin:electrobun|dialog_ask", true);
    const adapter = createElectrobunDialogAdapter();
    const result = await adapter.ask("Continue?", {
      title: "Confirm",
      okLabel: "Yes",
      cancelLabel: "No",
    });

    expect(result).toBe(true);
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|dialog_ask",
      args: { text: "Continue?", title: "Confirm", okLabel: "Yes", cancelLabel: "No" },
    });
  });

  test("open invokes dialog_open with options", async () => {
    invokeReturns.set("plugin:electrobun|dialog_open", ["/file1.txt", "/file2.txt"]);
    const adapter = createElectrobunDialogAdapter();
    const result = await adapter.open({
      title: "Open File",
      multiple: true,
      directory: false,
      filters: [{ name: "Text", extensions: ["txt"] }],
    });

    expect(result).toEqual(["/file1.txt", "/file2.txt"]);
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|dialog_open",
      args: {
        title: "Open File",
        multiple: true,
        directory: false,
        filters: [{ name: "Text", extensions: ["txt"] }],
      },
    });
  });

  test("open with no options uses defaults", async () => {
    invokeReturns.set("plugin:electrobun|dialog_open", null);
    const adapter = createElectrobunDialogAdapter();
    await adapter.open();

    expect(invokeCalls[0].args).toEqual({
      title: undefined,
      multiple: false,
      directory: false,
      filters: undefined,
    });
  });

  test("save invokes dialog_save", async () => {
    invokeReturns.set("plugin:electrobun|dialog_save", "/saves/game.sav");
    const adapter = createElectrobunDialogAdapter();
    const result = await adapter.save({ title: "Save", defaultPath: "/saves/game.sav" });

    expect(result).toBe("/saves/game.sav");
    expect(invokeCalls[0]).toEqual({
      command: "plugin:electrobun|dialog_save",
      args: { title: "Save", defaultPath: "/saves/game.sav" },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// bootstrapElectrobun
// ═══════════════════════════════════════════════════════════════════════════

describe("bootstrapElectrobun", () => {
  test("registers all adapters and core provider", async () => {
    bootstrapElectrobun(mockProvider);

    // Verify core provider is set
    const { getProvider } = await import("../core");
    expect(getProvider()?.id).toBe("electrobun-test");

    // Verify window adapter is wired — title() should delegate to invoke
    invokeReturns.set("plugin:electrobun|window_title", "Bootstrap Title");
    const win = getCurrentWindow();
    expect(await win.title()).toBe("Bootstrap Title");

    // Verify event adapter is wired — emit should delegate to invoke
    invokeCalls.length = 0;
    await emit("test:event", { x: 1 });
    expect(invokeCalls[0].command).toBe("plugin:electrobun|event_emit");

    // Verify fs adapter is wired — exists should delegate to invoke
    invokeCalls.length = 0;
    invokeReturns.set("plugin:electrobun|fs_exists", false);
    expect(await exists("/nope")).toBe(false);
    expect(invokeCalls[0].command).toBe("plugin:electrobun|fs_exists");

    // Verify dialog adapter is wired — message should delegate to invoke
    invokeCalls.length = 0;
    await message("hi");
    expect(invokeCalls[0].command).toBe("plugin:electrobun|dialog_message");
  });

  test("uses default core provider when none supplied", () => {
    // Should not throw during bootstrap itself
    bootstrapElectrobun();

    const { getProvider } = require("../core");
    expect(getProvider()?.id).toBe("electrobun");
  });

  test("default core provider convertFileSrc produces electrobun:// URLs", () => {
    const provider = createElectrobunCoreProvider();
    expect(provider.convertFileSrc("/sprites/hero.png")).toBe(
      "electrobun://asset/sprites/hero.png",
    );
    expect(provider.convertFileSrc("data/save.json")).toBe(
      "electrobun://asset/data/save.json",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Module-level delegation after bootstrap
// ═══════════════════════════════════════════════════════════════════════════

describe("module-level delegation after bootstrap", () => {
  beforeEach(() => {
    bootstrapElectrobun(mockProvider);
  });

  test("getCurrentWindow().title() delegates through window adapter", async () => {
    invokeReturns.set("plugin:electrobun|window_title", "Delegated Title");
    const win = getCurrentWindow();
    expect(await win.title()).toBe("Delegated Title");
  });

  test("getCurrentWindow().setTitle() delegates through window adapter", async () => {
    const win = getCurrentWindow();
    await win.setTitle("Changed");
    expect(invokeCalls.some((c) => c.command === "plugin:electrobun|window_set_title")).toBe(true);
  });

  test("listen() delegates through event adapter", async () => {
    invokeReturns.set("plugin:electrobun|event_listen", 1);
    const unlisten = await listen("game:tick", () => {});
    expect(invokeCalls.some((c) => c.command === "plugin:electrobun|event_listen")).toBe(true);
    unlisten();
  });

  test("writeTextFile() delegates through fs adapter", async () => {
    await writeTextFile("/save/data.json", '{"level":1}');
    expect(invokeCalls.some((c) => c.command === "plugin:electrobun|fs_write_text_file")).toBe(true);
  });

  test("readTextFile() delegates through fs adapter", async () => {
    invokeReturns.set("plugin:electrobun|fs_read_text_file", "content");
    expect(await readTextFile("/save/data.json")).toBe("content");
  });

  test("message() delegates through dialog adapter", async () => {
    await message("Game over!");
    expect(invokeCalls.some((c) => c.command === "plugin:electrobun|dialog_message")).toBe(true);
  });

  test("ask() delegates through dialog adapter", async () => {
    invokeReturns.set("plugin:electrobun|dialog_ask", false);
    expect(await ask("Quit?")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Error passthrough
// ═══════════════════════════════════════════════════════════════════════════

describe("error passthrough from invoke failures", () => {
  test("window adapter propagates invoke errors", async () => {
    invokeErrors.set(
      "plugin:electrobun|window_is_fullscreen",
      new Error("backend unreachable"),
    );
    const adapter = createElectrobunWindowAdapter();
    await expect(adapter.isFullscreen()).rejects.toThrow("backend unreachable");
  });

  test("event adapter propagates invoke errors on listen", async () => {
    invokeErrors.set(
      "plugin:electrobun|event_listen",
      new Error("subscription failed"),
    );
    const adapter = createElectrobunEventAdapter();
    await expect(adapter.listen("test", () => {})).rejects.toThrow("subscription failed");
  });

  test("fs adapter propagates invoke errors on readTextFile", async () => {
    invokeErrors.set(
      "plugin:electrobun|fs_read_text_file",
      new Error("file not found"),
    );
    const adapter = createElectrobunFsAdapter();
    await expect(adapter.readTextFile("/missing")).rejects.toThrow("file not found");
  });

  test("dialog adapter propagates invoke errors on ask", async () => {
    invokeErrors.set(
      "plugin:electrobun|dialog_ask",
      new Error("dialog dismissed"),
    );
    const adapter = createElectrobunDialogAdapter();
    await expect(adapter.ask("Continue?")).rejects.toThrow("dialog dismissed");
  });

  test("default core provider invoke throws without IPC bridge", async () => {
    const provider = createElectrobunCoreProvider();
    await expect(provider.invoke("test_cmd")).rejects.toThrow(
      "No IPC bridge configured",
    );
  });
});
