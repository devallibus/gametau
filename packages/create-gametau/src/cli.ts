#!/usr/bin/env node

/**
 * create-gametau — Scaffold a Tauri game with web + desktop deployment.
 *
 * Usage:
 *   bunx create-gametau my-game
 *   bunx create-gametau my-game --template pixi
 *   bunx create-gametau my-game --template vanilla
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
type Template = (typeof TEMPLATES)[number];

interface Options {
  projectName: string;
  template: Template;
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

  return { projectName: positional[0], template };
}

function printHelp(): void {
  console.log(`
create-gametau — Scaffold a Tauri game with web + desktop deployment

Usage:
  bunx create-gametau <project-name> [options]

Options:
  --template, -t   Template to use: three (default), pixi, vanilla
  --help, -h       Show this help message
  --version, -v    Show CLI version

Examples:
  bunx create-gametau my-game
  bunx create-gametau my-game --template pixi
  bun create gametau my-game
`.trim());
}

function getTemplatesDir(): string {
  // Works both when running from source (dev) and from dist (published)
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = resolve(dirname(thisFile), "..");
  return join(packageRoot, "templates");
}

export function scaffold(options: Options, cwd?: string): void {
  const { projectName, template } = options;
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

  // Copy base template
  mkdirSync(targetDir, { recursive: true });
  cpSync(baseDir, targetDir, { recursive: true });

  // Copy template overlay (overwrites base files where applicable)
  if (existsSync(overlayDir)) {
    cpSync(overlayDir, targetDir, { recursive: true });
  }

  // npm strips dotfiles named .gitignore / .npmignore from tarballs.
  // Templates store the file as "gitignore" (no dot) and we rename it here.
  renameTemplateGitignore(targetDir);

  // Rust crate references in code use underscore identifiers, while
  // package names and UI strings should preserve the original project name.
  replaceInDir(targetDir, "{{PROJECT_NAME}}_", `${toRustIdent(projectName)}_`);

  // Replace {{PROJECT_NAME}} placeholders
  replaceInDir(targetDir, "{{PROJECT_NAME}}", projectName);
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
        // Skip binary files
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
  // Bun exposes import.meta.main directly.
  if (typeof Bun !== "undefined") {
    return import.meta.main;
  }

  // Node 20 does not expose import.meta.main.
  // For npm/pnpm/yarn shims, argv[1] often points at node_modules/.bin/create-gametau.
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const entryPath = normalizeExecPath(entry);
    const currentPath = normalizeExecPath(currentFile);
    if (entryPath === currentPath) return true;

    // Fallback for shim launchers where argv[1] is the shim itself.
    const launcher = basename(entryPath).toLowerCase();
    return launcher === "create-gametau" || launcher === "create-gametau.cmd" || launcher === "create-gametau.ps1";
  } catch {
    return false;
  }
}

// Main — only runs when executed directly (not when imported by tests)
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
  bun run dev          # web dev server
  bun run dev:tauri    # desktop dev (requires Tauri CLI)
  bun run build:web    # build for web deployment
  bun run build:desktop # build desktop app
`);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
