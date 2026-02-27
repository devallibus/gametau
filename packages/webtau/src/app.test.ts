import { afterEach, describe, expect, test } from "bun:test";
import {
  getName,
  getVersion,
  getTauriVersion,
  show,
  hide,
  setAppName,
  setAppVersion,
} from "./app";

const originalDocument = (globalThis as { document?: unknown }).document;

afterEach(() => {
  setAppName(null);
  setAppVersion(null);
  (globalThis as { document?: unknown }).document = originalDocument;
});

describe("webtau/app", () => {
  // -- getName --

  test("getName returns configured name when set", async () => {
    setAppName("My Game");
    expect(await getName()).toBe("My Game");
  });

  test("getName falls back to document.title", async () => {
    setAppName(null);
    setAppVersion(null);
    (globalThis as { document?: unknown }).document = { title: "Browser Title" };
    expect(await getName()).toBe("Browser Title");
  });

  test("getName returns default when no title or config", async () => {
    setAppName(null);
    setAppVersion(null);
    (globalThis as { document?: unknown }).document = undefined;
    expect(await getName()).toBe("gametau-app");
  });

  test("getName returns default when document.title is empty", async () => {
    setAppName(null);
    setAppVersion(null);
    (globalThis as { document?: unknown }).document = { title: "" };
    expect(await getName()).toBe("gametau-app");
  });

  // -- getVersion --

  test("getVersion returns configured version", async () => {
    setAppVersion("1.2.3");
    expect(await getVersion()).toBe("1.2.3");
  });

  test("getVersion returns 0.0.0 by default", async () => {
    setAppName(null);
    setAppVersion(null);
    expect(await getVersion()).toBe("0.0.0");
  });

  // -- getTauriVersion --

  test("getTauriVersion returns 'web' in web mode", async () => {
    expect(await getTauriVersion()).toBe("web");
  });

  // -- show / hide --

  test("show is a no-op that resolves", async () => {
    await expect(show()).resolves.toBeUndefined();
  });

  test("hide is a no-op that resolves", async () => {
    await expect(hide()).resolves.toBeUndefined();
  });

  // -- setAppName / setAppVersion override lifecycle --

  test("setAppName overrides subsequent getName calls", async () => {
    setAppName("First");
    expect(await getName()).toBe("First");
    setAppName("Second");
    expect(await getName()).toBe("Second");
  });

  test("setAppVersion overrides subsequent getVersion calls", async () => {
    setAppVersion("1.0.0");
    expect(await getVersion()).toBe("1.0.0");
    setAppVersion("2.0.0");
    expect(await getVersion()).toBe("2.0.0");
  });
});
