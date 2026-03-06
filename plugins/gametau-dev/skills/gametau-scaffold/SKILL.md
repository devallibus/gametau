---
name: gametau-scaffold
description: Use when creating a new gametau project, setting up the Rust workspace, configuring Vite with webtau-vite, choosing a renderer template, or understanding the scaffolded project structure.
---

# gametau Project Scaffolding

## Create a New Project

```bash
bunx create-gametau my-game              # Three.js (default)
bunx create-gametau my-game -t pixi      # PixiJS
bunx create-gametau my-game -t vanilla   # Canvas2D
bunx create-gametau my-game --desktop-shell electrobun
```

Then:
```bash
cd my-game
bun install
bun run dev    # Opens localhost:1420 with hot-reload
```

## Prerequisites

- Rust with `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- wasm-pack: `cargo install wasm-pack`
- Bun (or Node 18+)
- Tauri CLI (only for desktop): `bun add -g @tauri-apps/cli`

## Scaffolded Structure

```
my-game/
  src-tauri/
    Cargo.toml              # Workspace: [core, commands, app, wasm]
    core/
      src/lib.rs            # Pure Rust game logic — NO framework deps
      Cargo.toml            # Only serde
    commands/
      src/lib.rs            # Re-exports from submodule
      src/commands.rs       # #[webtau::command] functions + wasm_state!
      Cargo.toml            # Depends on core, webtau, wasm-bindgen, serde
    app/
      src/lib.rs            # Tauri shell: generate_handler! + Mutex state
      tauri.conf.json
      Cargo.toml            # Depends on tauri, commands
    wasm/
      src/lib.rs            # Links commands: `use my_game_commands as _;`
      Cargo.toml            # crate-type = ["cdylib"], depends on commands
  src/
    index.ts                # Entry: configure() + bootstrapTauri()
    game/scene.ts           # Three.js / PixiJS / Canvas2D scene
    game/loop.ts            # requestAnimationFrame + tick
    services/backend.ts     # Typed invoke() wrappers + task seams
    services/settings.ts    # Runtime settings (webtau/path + webtau/fs)
    services/comms.ts       # Event-driven comms (webtau/event)
    services/contracts.ts   # Shared TypeScript interfaces
  package.json
  vite.config.ts            # webtau-vite plugin
```

## Vite Configuration

```typescript
import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

export default defineConfig({
  plugins: [webtauVite()],
});
```

Zero config for the standard layout. Options (all optional):
- `wasmCrate: "src-tauri/wasm"` — path to WASM crate
- `wasmOutDir: "src/wasm"` — wasm-pack output directory
- `watchPaths: []` — extra dirs to watch
- `wasmOpt: false` — run wasm-opt on release builds

## Build Targets

| Target | Command | Output |
|---|---|---|
| Dev (web) | `bun run dev` | localhost:1420, hot-reload, no Tauri needed |
| Web release | `bun run build:web` | Static files for any host |
| Desktop | `bun run build:desktop` | Native .exe/.dmg/.AppImage via Tauri |

## Entry Point Pattern

```typescript
// src/index.ts
import { configure, isTauri } from "webtau";

if (!isTauri()) {
  configure({
    loadWasm: async () => {
      const wasm = await import("./wasm/my_game_wasm");
      await wasm.default();
      wasm.init();
      return wasm;
    },
  });
}
// From here, invoke() works on both platforms
```

## WASM Optimization

Add to `wasm/Cargo.toml`:
```toml
[profile.release]
lto = true
opt-level = "z"
codegen-units = 1
strip = true
```

Expected sizes: simple game ~50-100 KB WASM (20-40 KB gzipped).
