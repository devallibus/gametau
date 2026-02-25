import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { scaffold } from "./cli";

const TMP_DIR = join(import.meta.dir, "..", "__test_output__");

function scaffoldIn(name: string, template: "three" | "pixi" | "vanilla" = "three") {
  const originalCwd = process.cwd();
  try {
    process.chdir(TMP_DIR);
    scaffold({ projectName: name, template });
  } finally {
    process.chdir(originalCwd);
  }
}

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
  const { mkdirSync } = require("fs");
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("create-gametau CLI", () => {
  test("scaffolds a project with default (three) template", () => {
    scaffoldIn("test-game");

    const projectDir = join(TMP_DIR, "test-game");
    expect(existsSync(projectDir)).toBe(true);

    // Check key files exist
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src-tauri", "Cargo.toml"))).toBe(true);
    expect(existsSync(join(projectDir, "src-tauri", "core", "src", "lib.rs"))).toBe(true);
    expect(existsSync(join(projectDir, "src-tauri", "wasm", "src", "lib.rs"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "game", "scene.ts"))).toBe(true);

    // Check Three.js dependency in package.json
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.three).toBeDefined();
  });

  test("replaces {{PROJECT_NAME}} placeholders", () => {
    scaffoldIn("my-cool-game");
    const projectDir = join(TMP_DIR, "my-cool-game");

    const cargoToml = readFileSync(
      join(projectDir, "src-tauri", "core", "Cargo.toml"),
      "utf-8",
    );
    expect(cargoToml).toContain("my-cool-game-core");
    expect(cargoToml).not.toContain("{{PROJECT_NAME}}");
  });

  test("scaffolds with pixi template", () => {
    scaffoldIn("pixi-game", "pixi");

    const projectDir = join(TMP_DIR, "pixi-game");
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["pixi.js"]).toBeDefined();
  });

  test("scaffolds with vanilla template", () => {
    scaffoldIn("vanilla-game", "vanilla");

    const projectDir = join(TMP_DIR, "vanilla-game");
    // Vanilla has no extra rendering deps
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.three).toBeUndefined();
  });

  test("generated vite.config.ts uses zero-config webtauVite()", () => {
    scaffoldIn("config-check-game");
    const projectDir = join(TMP_DIR, "config-check-game");
    const viteConfig = readFileSync(join(projectDir, "vite.config.ts"), "utf-8");

    // Should use webtauVite() with no args — default-first convention
    expect(viteConfig).toContain("webtauVite()");
    // Should NOT contain explicit option keys (those are overrides, not defaults)
    expect(viteConfig).not.toContain("wasmCrate:");
    expect(viteConfig).not.toContain("wasmOutDir:");
    expect(viteConfig).not.toContain("watchPaths:");
  });

  test("no {{PROJECT_NAME}} placeholders remain in any file", () => {
    scaffoldIn("placeholder-check");
    const projectDir = join(TMP_DIR, "placeholder-check");

    // Recursively check all text files for leftover placeholders
    function checkDir(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else {
          try {
            const content = readFileSync(full, "utf-8");
            expect(content).not.toContain("{{PROJECT_NAME}}");
          } catch {
            // Binary file, skip
          }
        }
      }
    }
    checkDir(projectDir);
  });

  test("fails on existing non-empty directory", () => {
    // First scaffold
    scaffoldIn("conflict-game");
    // Second scaffold should fail
    expect(() => scaffoldIn("conflict-game")).toThrow("already exists");
  });
});
