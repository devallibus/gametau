import { beforeAll, describe, expect, test } from "bun:test";

// Provide minimal browser globals for testing.
// Must be set before importing the window module since it
// references document/screen/window at module scope.
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
      close: () => {},
    };
  }
});

// Must import AFTER globals are set up — use dynamic import
let getCurrentWindow: typeof import("./window").getCurrentWindow;

beforeAll(async () => {
  const mod = await import("./window");
  getCurrentWindow = mod.getCurrentWindow;
});

// ---------------------------------------------------------------------------
// Singleton behavior
// ---------------------------------------------------------------------------

describe("getCurrentWindow", () => {
  test("returns singleton", () => {
    const a = getCurrentWindow();
    const b = getCurrentWindow();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

describe("title", () => {
  test("setTitle / title update document.title", async () => {
    const win = getCurrentWindow();
    await win.setTitle("Test Game");
    expect(await win.title()).toBe("Test Game");
    expect(document.title).toBe("Test Game");
  });
});

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------

describe("fullscreen", () => {
  test("isFullscreen returns false by default", async () => {
    const win = getCurrentWindow();
    expect(await win.isFullscreen()).toBe(false);
  });

  test("isMaximized returns false by default (maps to fullscreen)", async () => {
    const win = getCurrentWindow();
    expect(await win.isMaximized()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Window size
// ---------------------------------------------------------------------------

describe("window size", () => {
  test("innerSize returns window inner dimensions", async () => {
    const win = getCurrentWindow();
    const size = await win.innerSize();
    expect(size.width).toBe(1280);
    expect(size.height).toBe(720);
    expect(size.type).toBe("Physical");
  });

  test("outerSize returns window outer dimensions", async () => {
    const win = getCurrentWindow();
    const size = await win.outerSize();
    expect(size.width).toBe(1300);
    expect(size.height).toBe(750);
    expect(size.type).toBe("Physical");
  });

  test("setSize with LogicalSize calls resizeTo directly", async () => {
    let resizedTo: [number, number] | null = null;
    (globalThis as any).window.resizeTo = (w: number, h: number) => {
      resizedTo = [w, h];
    };

    const { LogicalSize } = await import("./dpi");
    const win = getCurrentWindow();
    await win.setSize(new LogicalSize(800, 600));
    expect(resizedTo).toEqual([800, 600]);

    // Restore
    (globalThis as any).window.resizeTo = () => {};
  });

  test("setSize with PhysicalSize scales by devicePixelRatio", async () => {
    let resizedTo: [number, number] | null = null;
    (globalThis as any).window.resizeTo = (w: number, h: number) => {
      resizedTo = [w, h];
    };
    (globalThis as any).window.devicePixelRatio = 2;

    const { PhysicalSize } = await import("./dpi");
    const win = getCurrentWindow();
    await win.setSize(new PhysicalSize(1600, 1200));
    expect(resizedTo).toEqual([800, 600]);

    // Restore
    (globalThis as any).window.devicePixelRatio = 1;
    (globalThis as any).window.resizeTo = () => {};
  });
});

// ---------------------------------------------------------------------------
// Close / Minimize / Show / Hide
// ---------------------------------------------------------------------------

describe("close", () => {
  test("close calls window.close", async () => {
    let closed = false;
    (globalThis as any).window.close = () => {
      closed = true;
    };

    const win = getCurrentWindow();
    await win.close();
    expect(closed).toBe(true);

    // Restore
    (globalThis as any).window.close = () => {};
  });
});

describe("minimize / unminimize", () => {
  test("minimize is a no-op that does not throw", async () => {
    const win = getCurrentWindow();
    await win.minimize();
  });

  test("unminimize is a no-op that does not throw", async () => {
    const win = getCurrentWindow();
    await win.unminimize();
  });
});

describe("show / hide", () => {
  test("show is a no-op that does not throw", async () => {
    const win = getCurrentWindow();
    await win.show();
  });

  test("hide is a no-op that does not throw", async () => {
    const win = getCurrentWindow();
    await win.hide();
  });
});

// ---------------------------------------------------------------------------
// Decorations (no-op on web)
// ---------------------------------------------------------------------------

describe("decorations", () => {
  test("setDecorations is a no-op that does not throw", async () => {
    const win = getCurrentWindow();
    // Should not throw for either value
    await win.setDecorations(true);
    await win.setDecorations(false);
  });
});

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

describe("center", () => {
  test("center calls moveTo with computed center coordinates", async () => {
    let movedTo: [number, number] | null = null;
    (globalThis as any).window.moveTo = (x: number, y: number) => {
      movedTo = [x, y];
    };

    const win = getCurrentWindow();
    await win.center();

    // screen(1920x1080), outerSize(1300x750)
    // left = (1920 - 1300) / 2 = 310
    // top  = (1080 - 750)  / 2 = 165
    expect(movedTo).toEqual([310, 165]);

    // Restore
    (globalThis as any).window.moveTo = () => {};
  });
});

// ---------------------------------------------------------------------------
// Monitor
// ---------------------------------------------------------------------------

describe("monitor", () => {
  test("currentMonitor returns screen info", async () => {
    const win = getCurrentWindow();
    const monitor = await win.currentMonitor();
    expect(monitor).not.toBeNull();
    expect(monitor?.size.width).toBe(1920);
    expect(monitor?.size.height).toBe(1080);
    expect(monitor?.scaleFactor).toBe(1);
  });

  test("currentMonitor name is null (unknown on web)", async () => {
    const win = getCurrentWindow();
    const monitor = await win.currentMonitor();
    expect(monitor?.name).toBeNull();
  });

  test("currentMonitor position is origin (0,0)", async () => {
    const win = getCurrentWindow();
    const monitor = await win.currentMonitor();
    expect(monitor?.position.x).toBe(0);
    expect(monitor?.position.y).toBe(0);
  });

  test("scaleFactor returns devicePixelRatio", async () => {
    const win = getCurrentWindow();
    const sf = await win.scaleFactor();
    expect(sf).toBe(1);
  });
});
