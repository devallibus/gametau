import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const TMP_DIR = join(import.meta.dir, "..", "__test_output__");
const CLI_PATH = join(import.meta.dir, "cli.ts");

function run(args: string): string {
  return execSync(`bun ${CLI_PATH} ${args}`, {
    cwd: TMP_DIR,
    encoding: "utf-8",
    timeout: 10000,
  });
}

beforeEach(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true });
  }
  const { mkdirSync } = require("fs");
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true });
  }
});

describe("create-gametau CLI", () => {
  test("scaffolds a project with default (three) template", () => {
    const output = run("test-game");
    expect(output).toContain("Creating test-game with three template");
    expect(output).toContain("Done!");

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
    run("my-cool-game");
    const projectDir = join(TMP_DIR, "my-cool-game");

    const cargoToml = readFileSync(
      join(projectDir, "src-tauri", "core", "Cargo.toml"),
      "utf-8",
    );
    expect(cargoToml).toContain("my-cool-game-core");
    expect(cargoToml).not.toContain("{{PROJECT_NAME}}");
  });

  test("scaffolds with pixi template", () => {
    const output = run("pixi-game --template pixi");
    expect(output).toContain("Creating pixi-game with pixi template");

    const projectDir = join(TMP_DIR, "pixi-game");
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["pixi.js"]).toBeDefined();
  });

  test("scaffolds with vanilla template", () => {
    const output = run("vanilla-game --template vanilla");
    expect(output).toContain("Creating vanilla-game with vanilla template");

    const projectDir = join(TMP_DIR, "vanilla-game");
    // Vanilla has no extra rendering deps
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.three).toBeUndefined();
  });

  test("generated vite.config.ts uses zero-config webtauVite()", () => {
    run("config-check-game");
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
    run("placeholder-check");
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
    run("conflict-game");
    // Second scaffold should fail
    try {
      run("conflict-game");
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err.stderr?.toString() || err.message).toContain("already exists");
    }
  });
});
