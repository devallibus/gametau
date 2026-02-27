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
  // Reset configured overrides by setting to a known name then clearing
  // via the module's internal state. We re-import fresh state by calling
  // the setters with values that restore defaults.
  setAppName(null as unknown as string);
  setAppVersion(null as unknown as string);
  (globalThis as { document?: unknown }).document = originalDocument;
});

// Re-set null after import to clear any leftover state — the setters
// accept string but we exploit the null check internally.
function clearOverrides() {
  // The module stores null as "not configured" — we poke it back.
  // This is safe because the module checks `!== null`.
  (setAppName as (v: string | null) => void)(null);
  (setAppVersion as (v: string | null) => void)(null);
}

describe("webtau/app", () => {
  // -- getName --

  test("getName returns configured name when set", async () => {
    setAppName("My Game");
    expect(await getName()).toBe("My Game");
  });

  test("getName falls back to document.title", async () => {
    clearOverrides();
    (globalThis as { document?: unknown }).document = { title: "Browser Title" };
    expect(await getName()).toBe("Browser Title");
  });

  test("getName returns default when no title or config", async () => {
    clearOverrides();
    (globalThis as { document?: unknown }).document = undefined;
    expect(await getName()).toBe("gametau-app");
  });

  test("getName returns default when document.title is empty", async () => {
    clearOverrides();
    (globalThis as { document?: unknown }).document = { title: "" };
    expect(await getName()).toBe("gametau-app");
  });

  // -- getVersion --

  test("getVersion returns configured version", async () => {
    setAppVersion("1.2.3");
    expect(await getVersion()).toBe("1.2.3");
  });

  test("getVersion returns 0.0.0 by default", async () => {
    clearOverrides();
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
