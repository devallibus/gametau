import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, rmSync, readFileSync, readdirSync, mkdirSync } from "fs";
import { join } from "path";
import { scaffold } from "./cli";

// Use a project-local scratch directory for test isolation
const TEST_ROOT = join(import.meta.dir, "..", ".test-scratch");

let testDir: string;

afterEach(() => {
  if (testDir) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

function freshDir(): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testDir = join(TEST_ROOT, id);
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

describe("create-gametau CLI", () => {
  test("scaffolds a project with default (three) template", () => {
    const dir = freshDir();
    scaffold({ projectName: "test-game", template: "three" }, dir);

    const projectDir = join(dir, "test-game");
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
    const dir = freshDir();
    scaffold({ projectName: "my-cool-game", template: "three" }, dir);
    const projectDir = join(dir, "my-cool-game");

    const cargoToml = readFileSync(
      join(projectDir, "src-tauri", "core", "Cargo.toml"),
      "utf-8",
    );
    expect(cargoToml).toContain("my-cool-game-core");
    expect(cargoToml).not.toContain("{{PROJECT_NAME}}");
  });

  test("scaffolds with pixi template", () => {
    const dir = freshDir();
    scaffold({ projectName: "pixi-game", template: "pixi" }, dir);

    const projectDir = join(dir, "pixi-game");
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["pixi.js"]).toBeDefined();
  });

  test("scaffolds with vanilla template", () => {
    const dir = freshDir();
    scaffold({ projectName: "vanilla-game", template: "vanilla" }, dir);

    const projectDir = join(dir, "vanilla-game");
    // Vanilla has no extra rendering deps
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.dependencies.three).toBeUndefined();
  });

  test("generated vite.config.ts uses zero-config webtauVite()", () => {
    const dir = freshDir();
    scaffold({ projectName: "config-check-game", template: "three" }, dir);
    const projectDir = join(dir, "config-check-game");
    const viteConfig = readFileSync(join(projectDir, "vite.config.ts"), "utf-8");

    // Should use webtauVite() with no args — default-first convention
    expect(viteConfig).toContain("webtauVite()");
    // Should NOT contain explicit option keys (those are overrides, not defaults)
    expect(viteConfig).not.toContain("wasmCrate:");
    expect(viteConfig).not.toContain("wasmOutDir:");
    expect(viteConfig).not.toContain("watchPaths:");
  });

  test("no {{PROJECT_NAME}} placeholders remain in any file", () => {
    const dir = freshDir();
    scaffold({ projectName: "placeholder-check", template: "three" }, dir);
    const projectDir = join(dir, "placeholder-check");

    // Recursively check all text files for leftover placeholders
    function checkDir(d: string) {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
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
    const dir = freshDir();
    // First scaffold
    scaffold({ projectName: "conflict-game", template: "three" }, dir);
    // Second scaffold should fail
    expect(() => scaffold({ projectName: "conflict-game", template: "three" }, dir)).toThrow(
      "already exists",
    );
  });
});
