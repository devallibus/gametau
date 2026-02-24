/**
 * webtau-vite — Vite plugin for building Tauri games as web apps.
 *
 * - Runs wasm-pack to compile Rust → WASM
 * - Watches Rust files for changes during dev
 * - Aliases @tauri-apps/api/* → webtau/* in web builds
 * - Detects Tauri mode (TAURI_ENV_PLATFORM) and becomes a no-op
 */

import { type Plugin, type ResolvedConfig } from "vite";
import { execSync, type ExecSyncOptions } from "child_process";
import { watch, type FSWatcher } from "chokidar";
import { resolve, join } from "path";
import { existsSync } from "fs";

export interface WebtauViteOptions {
  /** Path to the wasm crate (relative to project root). Default: "src-tauri/wasm" */
  wasmCrate?: string;

  /** Where to output wasm-pack result (relative to project root). Default: "src/wasm" */
  wasmOutDir?: string;

  /** Additional directories to watch for Rust changes. Default: [] */
  watchPaths?: string[];

  /**
   * Run wasm-opt on release builds. Default: false
   * Requires wasm-opt to be installed globally.
   */
  wasmOpt?: boolean;
}

/** Import alias map: @tauri-apps/api/* → webtau/* */
const ALIASES: Record<string, string> = {
  "@tauri-apps/api/core": "webtau/core",
  "@tauri-apps/api/window": "webtau/window",
  "@tauri-apps/api/dpi": "webtau/dpi",
};

function isTauriMode(): boolean {
  return !!process.env.TAURI_ENV_PLATFORM;
}

function isWasmPackInstalled(): boolean {
  try {
    execSync("wasm-pack --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runWasmPack(
  cratePath: string,
  outDir: string,
  release: boolean,
  verbose: boolean,
): void {
  const profile = release ? "--release" : "--dev";
  const cmd = `wasm-pack build ${cratePath} --target web --out-dir ${outDir} ${profile} --no-typescript`;

  if (verbose) {
    console.log(`[webtau-vite] ${cmd}`);
  }

  const opts: ExecSyncOptions = {
    stdio: verbose ? "inherit" : "pipe",
  };

  try {
    execSync(cmd, opts);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err);
    throw new Error(`[webtau-vite] wasm-pack build failed:\n${msg}`);
  }
}

export default function webtauVite(
  options: WebtauViteOptions = {},
): Plugin {
  const {
    wasmCrate = "src-tauri/wasm",
    wasmOutDir = "src/wasm",
    watchPaths = [],
    wasmOpt = false,
  } = options;

  let root: string;
  let resolvedCratePath: string;
  let resolvedOutDir: string;
  let isDev: boolean;
  let watcher: FSWatcher | null = null;

  return {
    name: "webtau-vite",
    enforce: "pre",

    configResolved(config: ResolvedConfig) {
      root = config.root;
      resolvedCratePath = resolve(root, wasmCrate);
      resolvedOutDir = resolve(root, wasmOutDir);
      isDev = config.command === "serve";
    },

    buildStart() {
      // In Tauri mode, do nothing — Tauri handles the Rust build
      if (isTauriMode()) {
        return;
      }

      // Check wasm-pack is installed
      if (!isWasmPackInstalled()) {
        this.error(
          "[webtau-vite] wasm-pack is not installed.\n" +
            "Install it with: cargo install wasm-pack\n" +
            "Or: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh",
        );
        return;
      }

      // Check crate exists
      const cargoToml = join(resolvedCratePath, "Cargo.toml");
      if (!existsSync(cargoToml)) {
        this.error(
          `[webtau-vite] No Cargo.toml found at ${cargoToml}.\n` +
            `Set wasmCrate option to the path of your wasm crate.`,
        );
        return;
      }

      // Run initial wasm-pack build
      console.log(
        `[webtau-vite] Building WASM (${isDev ? "dev" : "release"})...`,
      );
      runWasmPack(resolvedCratePath, resolvedOutDir, !isDev, true);

      // Optional wasm-opt for release builds
      if (wasmOpt && !isDev) {
        const wasmFile = join(resolvedOutDir, "*.wasm");
        try {
          execSync(`wasm-opt -Oz ${wasmFile} -o ${wasmFile}`, {
            stdio: "inherit",
          });
          console.log("[webtau-vite] wasm-opt optimization complete.");
        } catch {
          this.warn(
            "[webtau-vite] wasm-opt failed. Is it installed? " +
              "Install with: cargo install wasm-opt",
          );
        }
      }

      console.log("[webtau-vite] WASM build complete.");
    },

    configureServer(server) {
      // In Tauri mode, do nothing
      if (isTauriMode()) return;

      // Watch Rust source files and rebuild on change
      const watchDirs = [
        join(resolvedCratePath, "src"),
        ...watchPaths.map((p) => resolve(root, p)),
      ].filter((d) => existsSync(d));

      if (watchDirs.length === 0) return;

      watcher = watch(watchDirs, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 200 },
      });

      watcher.on("change", (path) => {
        if (!path.endsWith(".rs")) return;

        console.log(`[webtau-vite] Rust file changed: ${path}`);
        console.log("[webtau-vite] Rebuilding WASM (dev)...");

        try {
          runWasmPack(resolvedCratePath, resolvedOutDir, false, false);
          console.log("[webtau-vite] WASM rebuild complete. Reloading...");
          server.ws.send({ type: "full-reload" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[webtau-vite] Rebuild failed:\n${msg}`);
          // Don't crash the dev server on build failure
        }
      });
    },

    resolveId(source) {
      // In Tauri mode, let Tauri's own modules resolve normally
      if (isTauriMode()) return null;

      // Alias @tauri-apps/api/* → webtau/*
      if (source in ALIASES) {
        return { id: ALIASES[source], external: false };
      }

      return null;
    },

    closeBundle() {
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    },
  };
}
