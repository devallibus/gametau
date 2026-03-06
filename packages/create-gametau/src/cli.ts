#!/usr/bin/env node

/**
 * create-gametau - Scaffold a Tauri game with web + desktop deployment.
 *
 * Usage:
 *   bunx create-gametau my-game
 *   bunx create-gametau my-game --template pixi
 *   bunx create-gametau my-game --desktop-shell electrobun
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES = ["three", "pixi", "vanilla"] as const;
const DESKTOP_SHELLS = ["tauri", "electrobun"] as const;
const ELECTROBUN_MODES = ["hybrid", "native", "dual"] as const;
const ELECTROBUN_VERSION = "^1.15.1";
const CROSS_ENV_VERSION = "^7.0.3";
const CONCURRENTLY_VERSION = "^9.2.1";
const BUN_TYPES_VERSION = "^1.3.9";

type Template = (typeof TEMPLATES)[number];
type DesktopShell = (typeof DESKTOP_SHELLS)[number];
type ElectrobunMode = (typeof ELECTROBUN_MODES)[number];

interface Options {
  projectName: string;
  template: Template;
  desktopShell?: DesktopShell;
  electrobunMode?: ElectrobunMode;
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

function getPackageVersion(): string {
  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: string };
    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function parseArgs(args: string[]): Options {
  const positional: string[] = [];
  let template: Template = "three";
  let desktopShell: DesktopShell = "tauri";
  let electrobunMode: ElectrobunMode = "hybrid";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--template" || arg === "-t") {
      const next = args[++i];
      if (!next || !TEMPLATES.includes(next as Template)) {
        console.error(`Invalid template: ${next}`);
        console.error(`Available: ${TEMPLATES.join(", ")}`);
        process.exit(1);
      }
      template = next as Template;
    } else if (arg === "--desktop-shell") {
      const next = args[++i];
      if (!next || !DESKTOP_SHELLS.includes(next as DesktopShell)) {
        console.error(`Invalid desktop shell: ${next}`);
        console.error(`Available: ${DESKTOP_SHELLS.join(", ")}`);
        process.exit(1);
      }
      desktopShell = next as DesktopShell;
    } else if (arg === "--electrobun-mode") {
      const next = args[++i];
      if (!next || !ELECTROBUN_MODES.includes(next as ElectrobunMode)) {
        console.error(`Invalid Electrobun mode: ${next}`);
        console.error(`Available: ${ELECTROBUN_MODES.join(", ")}`);
        process.exit(1);
      }
      electrobunMode = next as ElectrobunMode;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--version" || arg === "-v") {
      console.log(`create-gametau ${getPackageVersion()}`);
      process.exit(0);
    } else if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      console.error("Run with --help to see available options.");
      process.exit(1);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    console.error("Error: project name required.\n");
    printHelp();
    process.exit(1);
  }

  const options: Options = {
    projectName: positional[0],
    template,
    desktopShell,
    electrobunMode,
  };

  validateOptions(options);
  return options;
}

function validateOptions(options: Options): void {
  const desktopShell = options.desktopShell ?? "tauri";
  const electrobunMode = options.electrobunMode ?? "hybrid";

  if (desktopShell !== "electrobun" && electrobunMode !== "hybrid") {
    throw new Error("--electrobun-mode requires --desktop-shell electrobun.");
  }
}

function printHelp(): void {
  console.log(`
create-gametau - Scaffold a Tauri game with web + desktop deployment

Usage:
  bunx create-gametau <project-name> [options]

Options:
  --template, -t          Template to use: three (default), pixi, vanilla
  --desktop-shell         Desktop shell: tauri (default), electrobun
  --electrobun-mode       Electrobun shell mode: hybrid (default), native, dual
  --help, -h              Show this help message
  --version, -v           Show CLI version

Examples:
  bunx create-gametau my-game
  bunx create-gametau my-game --template pixi
  bunx create-gametau my-game --desktop-shell electrobun
  bunx create-gametau my-game --desktop-shell electrobun --electrobun-mode dual
  bun create gametau my-game
`.trim());
}

function getTemplatesDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = resolve(dirname(thisFile), "..");
  return join(packageRoot, "templates");
}

export function scaffold(options: Options, cwd?: string): void {
  validateOptions(options);

  const projectName = options.projectName;
  const template = options.template;
  const desktopShell = options.desktopShell ?? "tauri";
  const electrobunMode = options.electrobunMode ?? "hybrid";
  const targetDir = resolve(cwd || process.cwd(), projectName);

  if (existsSync(targetDir)) {
    const contents = readdirSync(targetDir);
    if (contents.length > 0) {
      throw new Error(`directory "${projectName}" already exists and is not empty.`);
    }
  }

  const templatesDir = getTemplatesDir();
  const baseDir = join(templatesDir, "base");
  const overlayDir = join(templatesDir, template);

  if (!existsSync(baseDir)) {
    throw new Error(`base template not found at ${baseDir}`);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(baseDir, targetDir, { recursive: true });

  if (existsSync(overlayDir)) {
    cpSync(overlayDir, targetDir, { recursive: true });
  }

  renameTemplateGitignore(targetDir);
  replaceInDir(targetDir, "{{PROJECT_NAME}}_", `${toRustIdent(projectName)}_`);
  replaceInDir(targetDir, "{{PROJECT_NAME}}", projectName);

  if (desktopShell === "electrobun") {
    addElectrobunSupport(targetDir, projectName, electrobunMode);
  }
}

function addElectrobunSupport(
  targetDir: string,
  projectName: string,
  electrobunMode: ElectrobunMode,
): void {
  const packageJsonPath = join(targetDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as PackageJsonShape;

  packageJson.dependencies ??= {};
  packageJson.devDependencies ??= {};
  packageJson.scripts ??= {};

  packageJson.dependencies.electrobun = ELECTROBUN_VERSION;
  packageJson.devDependencies["@types/bun"] = BUN_TYPES_VERSION;
  packageJson.devDependencies["cross-env"] = CROSS_ENV_VERSION;
  packageJson.devDependencies.concurrently ??= CONCURRENTLY_VERSION;
  const electrobunCli = "node ./node_modules/electrobun/bin/electrobun.cjs";

  if (electrobunMode === "dual") {
    packageJson.scripts["dev:electrobun"] = "bun run dev:electrobun:browser";
    packageJson.scripts["dev:electrobun:browser"] =
      `concurrently -k -n WEB,APP "vite" "${electrobunCli} dev"`;
    packageJson.scripts["dev:electrobun:gpu"] =
      `concurrently -k -n WEB,APP "vite" "cross-env GAMETAU_ELECTROBUN_RENDER_MODE=gpu ${electrobunCli} dev"`;
    packageJson.scripts["build:electrobun"] = "bun run build:electrobun:browser";
    packageJson.scripts["build:electrobun:browser"] =
      `bun run build:web && ${electrobunCli} build`;
    packageJson.scripts["build:electrobun:gpu"] =
      `bun run build:web && cross-env GAMETAU_ELECTROBUN_RENDER_MODE=gpu ${electrobunCli} build`;
  } else if (electrobunMode === "native") {
    packageJson.scripts["dev:electrobun"] =
      `concurrently -k -n WEB,APP "vite" "cross-env GAMETAU_ELECTROBUN_RENDER_MODE=gpu ${electrobunCli} dev"`;
    packageJson.scripts["build:electrobun"] =
      `bun run build:web && cross-env GAMETAU_ELECTROBUN_RENDER_MODE=gpu ${electrobunCli} build`;
  } else {
    packageJson.scripts["dev:electrobun"] =
      `concurrently -k -n WEB,APP "vite" "${electrobunCli} dev"`;
    packageJson.scripts["build:electrobun"] = `bun run build:web && ${electrobunCli} build`;
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const bunDir = join(targetDir, "src", "bun");
  const typesDir = join(targetDir, "src", "types");
  mkdirSync(bunDir, { recursive: true });
  mkdirSync(typesDir, { recursive: true });
  patchElectrobunTypePaths(targetDir);
  writeFileSync(join(targetDir, "electrobun.config.ts"), buildElectrobunConfig(projectName));
  writeFileSync(join(bunDir, "browser.ts"), buildElectrobunBrowserEntrypoint(projectName));
  writeFileSync(join(bunDir, "gpu.ts"), buildElectrobunGpuEntrypoint(projectName));
  writeFileSync(join(typesDir, "electrobun.d.ts"), buildElectrobunConfigTypes());
  writeFileSync(join(typesDir, "electrobun-bun.d.ts"), buildElectrobunBunTypes());
}

function buildElectrobunConfig(projectName: string): string {
  return `import type { ElectrobunConfig } from "electrobun";

const renderMode = process.env.GAMETAU_ELECTROBUN_RENDER_MODE === "gpu"
  ? "gpu"
  : "browser";
const isGpu = renderMode === "gpu";

export default {
  app: {
    name: isGpu ? "${projectName} (Electrobun GPU)" : "${projectName} (Electrobun)",
    identifier: "dev.gametau.${toRustIdent(projectName)}.electrobun",
    version: "0.1.0",
  },
  build: {
    bun: {
      entrypoint: isGpu ? "src/bun/gpu.ts" : "src/bun/browser.ts",
    },
    copy: {
      "dist/index.html": "views/main/index.html",
      "dist/assets": "views/main/assets",
    },
    mac: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
    linux: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
    win: {
      bundleCEF: !isGpu,
      bundleWGPU: isGpu,
    },
  },
} satisfies ElectrobunConfig;
`;
}

function buildElectrobunBrowserEntrypoint(projectName: string): string {
  return `import { BrowserWindow } from "electrobun/bun";

const isProduction = Bun.env.NODE_ENV === "production";
const url = isProduction ? "views://main/index.html" : "http://localhost:1420";

new BrowserWindow({
  title: "${projectName} (Electrobun)",
  url,
});
`;
}

function buildElectrobunGpuEntrypoint(projectName: string): string {
  return `import { configure } from "webtau";
import { GpuWindow } from "electrobun/bun";
import { getWorldView, tickWorld } from "../services/backend";

async function loadWasmRuntime() {
  configure({
    loadWasm: async () => {
      const wasm = await import("../wasm/${toRustIdent(projectName)}_wasm");
      await wasm.default();
      wasm.init(42);
      return wasm;
    },
  });
}

async function main() {
  await loadWasmRuntime();

  const win = new GpuWindow({
    title: "${projectName} (Electrobun GPU)",
    frame: { x: 120, y: 120, width: 960, height: 640 },
    titleBarStyle: "default",
    transparent: false,
  });

  async function syncWindowTitle() {
    const view = await getWorldView();
    win.setTitle("${projectName} score " + view.score + " tick " + view.tick_count);
  }

  await syncWindowTitle();

  setInterval(() => {
    void tickWorld()
      .then(syncWindowTitle)
      .catch(console.error);
  }, 250);
}

main().catch(console.error);
`;
}

function patchElectrobunTypePaths(targetDir: string): void {
  const tsconfigPath = join(targetDir, "tsconfig.json");
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8")) as {
    compilerOptions?: {
      baseUrl?: string;
      types?: string[];
      paths?: Record<string, string[]>;
    };
  };

  tsconfig.compilerOptions ??= {};
  tsconfig.compilerOptions.baseUrl ??= ".";
  tsconfig.compilerOptions.types = ["bun"];
  tsconfig.compilerOptions.paths = {
    ...(tsconfig.compilerOptions.paths ?? {}),
    electrobun: ["./src/types/electrobun"],
    "electrobun/bun": ["./src/types/electrobun-bun"],
  };

  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

function buildElectrobunConfigTypes(): string {
  return `export interface ElectrobunConfig {
  app: {
    name: string;
    identifier: string;
    version: string;
  };
  build: {
    bun: {
      entrypoint: string;
    };
    copy?: Record<string, string>;
    mac?: { bundleCEF?: boolean; bundleWGPU?: boolean };
    linux?: { bundleCEF?: boolean; bundleWGPU?: boolean };
    win?: { bundleCEF?: boolean; bundleWGPU?: boolean };
  };
}
`;
}

function buildElectrobunBunTypes(): string {
  return `export class BrowserWindow {
  constructor(options: { title?: string; url: string });
}

export class GpuWindow {
  constructor(options: {
    title?: string;
    frame: { x: number; y: number; width: number; height: number };
    titleBarStyle: "hidden" | "hiddenInset" | "default";
    transparent: boolean;
  });

  setTitle(title: string): void;
}
`;
}

function toRustIdent(value: string): string {
  let ident = value.replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(ident)) {
    ident = `_${ident}`;
  }
  return ident;
}

function renameTemplateGitignore(dir: string): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      renameTemplateGitignore(fullPath);
      continue;
    }

    if (entry.name === "gitignore") {
      renameSync(fullPath, join(dir, ".gitignore"));
    }
  }
}

function replaceInDir(dir: string, search: string, replace: string): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInDir(fullPath, search, replace);
    } else {
      try {
        const content = readFileSync(fullPath, "utf-8");
        if (content.includes(search)) {
          writeFileSync(fullPath, content.replaceAll(search, replace));
        }
      } catch {
        // Skip binary files.
      }
    }
  }
}

function normalizeExecPath(path: string): string {
  try {
    return resolve(realpathSync(path));
  } catch {
    return resolve(path);
  }
}

function isDirectExecution(): boolean {
  if (typeof Bun !== "undefined") {
    return import.meta.main;
  }

  const entry = process.argv[1];
  if (!entry) return false;

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const entryPath = normalizeExecPath(entry);
    const currentPath = normalizeExecPath(currentFile);
    if (entryPath === currentPath) return true;

    const launcher = basename(entryPath).toLowerCase();
    return launcher === "create-gametau" || launcher === "create-gametau.cmd" || launcher === "create-gametau.ps1";
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  try {
    console.log(`Creating ${options.projectName} with ${options.template} template...`);
    scaffold(options);
    console.log(`
Done! Your game is ready.

  cd ${options.projectName}
  bun install
  bun run dev           # web dev server
  bun run dev:tauri     # desktop dev (requires Tauri CLI)
  bun run build:web     # build for web deployment
  bun run build:desktop # build desktop app
`);
    if ((options.desktopShell ?? "tauri") === "electrobun") {
      console.log(`Electrobun shell support was added:

  bun run dev:electrobun
  bun run build:electrobun
`);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
