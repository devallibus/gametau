import { describe, test, expect, beforeAll } from "bun:test";

// Provide minimal browser globals for testing
beforeAll(() => {
  if (typeof globalThis.document === "undefined") {
    (globalThis as any).document = {
      title: "",
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: async () => {},
      },
      exitFullscreen: async () => {},
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
    };
  }
});

// Must import AFTER globals are set up — use dynamic import
let getCurrentWindow: typeof import("./window").getCurrentWindow;

beforeAll(async () => {
  const mod = await import("./window");
  getCurrentWindow = mod.getCurrentWindow;
});

describe("getCurrentWindow", () => {
  test("returns singleton", () => {
    const a = getCurrentWindow();
    const b = getCurrentWindow();
    expect(a).toBe(b);
  });

  test("setTitle / title update document.title", async () => {
    const win = getCurrentWindow();
    await win.setTitle("Test Game");
    expect(await win.title()).toBe("Test Game");
    expect(document.title).toBe("Test Game");
  });

  test("currentMonitor returns screen info", async () => {
    const win = getCurrentWindow();
    const monitor = await win.currentMonitor();
    expect(monitor).not.toBeNull();
    expect(monitor!.size.width).toBe(1920);
    expect(monitor!.size.height).toBe(1080);
    expect(monitor!.scaleFactor).toBe(1);
  });

  test("scaleFactor returns devicePixelRatio", async () => {
    const win = getCurrentWindow();
    const sf = await win.scaleFactor();
    expect(sf).toBe(1);
  });

  test("innerSize returns window dimensions", async () => {
    const win = getCurrentWindow();
    const size = await win.innerSize();
    expect(size.width).toBe(1280);
    expect(size.height).toBe(720);
  });

  test("setDecorations is a no-op", async () => {
    const win = getCurrentWindow();
    await win.setDecorations(true);
    await win.setDecorations(false);
  });

  test("isFullscreen returns false by default", async () => {
    const win = getCurrentWindow();
    expect(await win.isFullscreen()).toBe(false);
  });
});
