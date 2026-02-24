import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import webtauVite from "./index";

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
