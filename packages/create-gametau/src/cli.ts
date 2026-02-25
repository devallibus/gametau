#!/usr/bin/env node

/**
 * create-gametau — Scaffold a Tauri game with web + desktop deployment.
 *
 * Usage:
 *   bunx create-gametau my-game
 *   bunx create-gametau my-game --template pixi
 *   bunx create-gametau my-game --template vanilla
 */

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, cpSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const TEMPLATES = ["three", "pixi", "vanilla"] as const;
type Template = (typeof TEMPLATES)[number];

interface Options {
  projectName: string;
  template: Template;
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
    } else if (!arg.startsWith("-")) {
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

  console.error("[scaffold-debug]", JSON.stringify({ cwd, processCwd: process.cwd(), projectName, targetDir, targetExists: existsSync(targetDir) }));

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

  // Replace {{PROJECT_NAME}} placeholders
  replaceInDir(targetDir, "{{PROJECT_NAME}}", projectName);
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

// Main — only runs when executed directly (not when imported by tests)
if (import.meta.main) {
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
