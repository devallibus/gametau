import { afterEach, describe, expect, test } from "bun:test";
import {
  getIdentifier,
  getName,
  getTauriVersion,
  getVersion,
  hide,
  setAppIdentifier,
  setAppName,
  setAppVersion,
  show,
} from "./app";

const originalDocument = (globalThis as { document?: unknown }).document;

afterEach(() => {
  setAppName(null);
  setAppVersion(null);
  setAppIdentifier(null);
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

  // -- getIdentifier --

  test("getIdentifier returns fallback when not set", async () => {
    setAppIdentifier(null);
    (globalThis as { document?: unknown }).document = undefined;
    expect(await getIdentifier()).toBe("dev.gametau.app");
  });

  test("setAppIdentifier sets custom identifier", async () => {
    setAppIdentifier("com.example.mygame");
    expect(await getIdentifier()).toBe("com.example.mygame");
  });

  test("setAppIdentifier(null) resets to fallback", async () => {
    setAppIdentifier("com.example.mygame");
    expect(await getIdentifier()).toBe("com.example.mygame");
    setAppIdentifier(null);
    (globalThis as { document?: unknown }).document = undefined;
    expect(await getIdentifier()).toBe("dev.gametau.app");
  });

  // -- edge cases --

  test("setAppName(null) resets to document.title fallback", async () => {
    setAppName("Overridden");
    expect(await getName()).toBe("Overridden");
    setAppName(null);
    (globalThis as { document?: unknown }).document = { title: "Fallback Title" };
    expect(await getName()).toBe("Fallback Title");
  });

  test("getVersion returns empty string when set to empty", async () => {
    setAppVersion("");
    expect(await getVersion()).toBe("");
  });

  test("setAppVersion(null) resets to 0.0.0 default", async () => {
    setAppVersion("3.0.0");
    expect(await getVersion()).toBe("3.0.0");
    setAppVersion(null);
    expect(await getVersion()).toBe("0.0.0");
  });
});
