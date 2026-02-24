# gametau

Deploy Tauri games to **web + desktop** from a single codebase.

Tauri is perfect for shipping games to Steam, but it has no web target and [won't get one](https://github.com/nicholasgasior/tauri/issues/8248). gametau bridges the gap — write your game logic once in Rust, and ship to both **itch.io / GitHub Pages** (WASM) and **Steam / desktop** (native) without maintaining two codebases.

## How It Works

```
Developer writes Rust game logic in core/ crate
                    |
    +---------------+---------------+
    |                               |
  Tauri build                    Web build
  (cargo, native)             (wasm-pack → WASM)
    |                               |
  #[tauri::command]           #[wasm_bindgen]
  State<Mutex<T>>             thread_local!{RefCell<T>}
    |                               |
  Tauri IPC                     Direct WASM call
    |                               |
    +---------------+---------------+
                    |
       invoke("tick_world") ← same frontend code
       (webtau auto-routes based on
        __TAURI_INTERNALS__ detection)
```

Your frontend calls `invoke("command_name")` everywhere. At runtime:
- **Inside Tauri** → routes through Tauri IPC (native speed)
- **In a browser** → calls the WASM export directly

The switch is automatic. Zero `if` statements in your game code.

## Packages

| Package | Registry | Purpose |
|---|---|---|
| [`webtau`](./crates/webtau) | crates.io | `wasm_state!` macro for WASM state management |
| [`webtau`](./packages/webtau) | npm | `invoke()` router + Tauri API shims |
| [`webtau-vite`](./packages/webtau-vite) | npm | Vite plugin: wasm-pack automation + import aliasing |
| [`create-gametau`](./packages/create-gametau) | npm | Project scaffolder CLI |

## Quick Start

```bash
# Scaffold a new project
bunx create-gametau my-game              # Three.js (default)
bunx create-gametau my-game -t pixi      # PixiJS
bunx create-gametau my-game -t vanilla   # Canvas2D

# Run it
cd my-game
bun install
bun run dev          # Web dev server (localhost:1420)
bun run dev:tauri    # Desktop dev (requires Tauri CLI)

# Ship it
bun run build:web       # → dist/ (deploy to itch.io, GitHub Pages, etc.)
bun run build:desktop   # → Tauri bundle (exe/dmg/AppImage)
```

## Project Structure (scaffolded)

```
my-game/
  src-tauri/
    Cargo.toml              # Rust workspace: [core, app, wasm]
    core/                   # Pure game logic (no framework deps)
      src/lib.rs            # GameWorld struct + commands
    app/                    # Tauri desktop shell
      src/lib.rs            # #[tauri::command] thin wrappers
      tauri.conf.json
    wasm/                   # WASM bindings
      src/lib.rs            # wasm_state! + #[wasm_bindgen] wrappers
  src/
    index.ts                # Entry point
    game/scene.ts           # Three.js / PixiJS / Canvas2D scene
    game/loop.ts            # requestAnimationFrame + tick integration
    services/backend.ts     # Typed invoke() wrappers
  package.json
  vite.config.ts            # Pre-configured with webtau-vite
```

## Usage Guide

### 1. Write game logic in Rust (`core/`)

Your core crate is pure Rust — no Tauri, no WASM dependencies. Just your game state and logic.

```rust
// src-tauri/core/src/lib.rs
use serde::Serialize;

#[derive(Serialize)]
pub struct WorldView { pub score: i32 }

#[derive(Serialize)]
pub struct TickResult { pub score_delta: i32 }

pub struct GameWorld { score: i32 }

impl GameWorld {
    pub fn new() -> Self { Self { score: 0 } }
    pub fn view(&self) -> WorldView { WorldView { score: self.score } }
    pub fn tick(&mut self) -> TickResult {
        self.score += 1;
        TickResult { score_delta: 1 }
    }
}
```

### 2. Wrap for Tauri (`app/`)

Standard `#[tauri::command]` functions with `State<Mutex<T>>`:

```rust
// src-tauri/app/src/lib.rs
use std::sync::Mutex;
use tauri::State;
use my_game_core::GameWorld;

struct AppState(Mutex<GameWorld>);

#[tauri::command]
fn get_world_view(state: State<AppState>) -> my_game_core::WorldView {
    state.0.lock().unwrap().view()
}

#[tauri::command]
fn tick_world(state: State<AppState>) -> my_game_core::TickResult {
    state.0.lock().unwrap().tick()
}
```

### 3. Wrap for WASM (`wasm/`)

Use `wasm_state!` to replace Tauri's `Mutex<T>` with thread-local storage:

```rust
// src-tauri/wasm/src/lib.rs
use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;
use my_game_core::GameWorld;

webtau::wasm_state!(GameWorld);

#[wasm_bindgen]
pub fn init() { set_state(GameWorld::new()); }

#[wasm_bindgen]
pub fn get_world_view() -> JsValue {
    with_state(|w| to_value(&w.view()).unwrap())
}

#[wasm_bindgen]
pub fn tick_world() -> JsValue {
    with_state_mut(|w| to_value(&w.tick()).unwrap())
}
```

### 4. Call from frontend (identical code for both targets)

```typescript
// src/services/backend.ts
import { invoke } from "webtau";

export const getWorldView = () => invoke<WorldView>("get_world_view");
export const tickWorld = () => invoke<TickResult>("tick_world");
```

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

// From here on, getWorldView() and tickWorld() work on both platforms
```

### 5. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import webtauVite from "webtau-vite";

export default defineConfig({
  plugins: [
    webtauVite({
      wasmCrate: "src-tauri/wasm",
      wasmOutDir: "src/wasm",
      watchPaths: ["src-tauri/core/src"],
    }),
  ],
});
```

## API Reference

### Rust: `webtau` crate

#### `wasm_state!(Type)`

Generates thread-local state management for WASM. Expands to:

- **`set_state(val: T)`** — Initialize or replace the state
- **`with_state(|state| ...)`** — Read-only access (panics if not initialized)
- **`with_state_mut(|state| ...)`** — Mutable access (panics if not initialized)

### npm: `webtau`

#### `configure(config)`

Configure the WASM module loader for web builds. No-op when running inside Tauri.

```typescript
configure({
  loadWasm: () => import("./wasm/my_game_wasm"),
  onLoadError: (err) => console.error(err),  // optional
});
```

#### `invoke<T>(command, args?)`

Universal IPC — routes to Tauri or WASM automatically.

In web mode, args are passed as a **single object** to the WASM export
(matching Tauri's named-args semantics). Your `#[wasm_bindgen]` function
should accept a `JsValue` and deserialize with `serde_wasm_bindgen::from_value()`.

```typescript
const view = await invoke<WorldView>("get_world_view");
const result = await invoke<TickResult>("tick_world", { speed: 2 });
```

#### `isTauri()`

Returns `true` when running inside Tauri (checks `window.__TAURI_INTERNALS__`).

### npm: `webtau/window`

Web shim for `@tauri-apps/api/window`. Import `getCurrentWindow()` — same API as Tauri, backed by Fullscreen API / `document.title` / `screen.*`.

| Method | Web Implementation |
|---|---|
| `isFullscreen()` | `document.fullscreenElement` |
| `setFullscreen(bool)` | Fullscreen API |
| `setTitle(string)` | `document.title` |
| `setSize(LogicalSize)` | `window.resizeTo()` |
| `currentMonitor()` | `screen.width/height` |
| `setDecorations(bool)` | No-op |
| `center()` | `window.moveTo()` |

### npm: `webtau/dpi`

Web shim for `@tauri-apps/api/dpi`. Exports `LogicalSize`, `PhysicalSize`, `LogicalPosition`, `PhysicalPosition` with conversion methods.

### npm: `webtau-vite`

Vite plugin that handles everything automatically:

| Feature | `vite dev` (web) | `vite build` (web) | `tauri dev`/`tauri build` |
|---|---|---|---|
| wasm-pack | `--dev` | `--release` | Skipped |
| Rust file watching | Chokidar → full-reload | N/A | Skipped |
| Import aliasing | `@tauri-apps/api/*` → `webtau/*` | Same | Disabled |
| wasm-opt | N/A | Optional (`wasmOpt: true`) | Skipped |

**Options:**

```typescript
webtauVite({
  wasmCrate: "src-tauri/wasm",      // Path to WASM crate
  wasmOutDir: "src/wasm",           // wasm-pack output directory
  watchPaths: ["src-tauri/core/src"], // Extra dirs to watch
  wasmOpt: false,                    // Run wasm-opt on release
})
```

## WASM Optimization

Add to your `wasm/Cargo.toml` for minimal bundle sizes:

```toml
[profile.release]
lto = true
opt-level = "z"
codegen-units = 1
strip = true
```

Expected sizes:
- Simple game (~600 LOC Rust): **50-100KB** WASM, ~20-40KB gzipped
- Complex simulation (~2000+ LOC): **200-500KB** WASM, ~80-200KB gzipped

## Examples

- **[`examples/counter`](./examples/counter)** — Simplest possible example. Counter with increment/decrement/reset that works on both web and desktop.

## Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Bun](https://bun.sh/) (or Node.js 18+)
- [Tauri CLI](https://v2.tauri.app/start/create-project/) (for desktop builds)

```bash
# Install wasm target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Install Tauri CLI
bun add -g @tauri-apps/cli
```

## Migrating an Existing Tauri Game

1. **Extract core logic** into a separate `core/` crate with no Tauri deps
2. **Create a `wasm/` crate** with `crate-type = ["cdylib"]`
3. **Use `wasm_state!`** + write `#[wasm_bindgen]` wrappers (typically 10-20 lines)
4. **Replace** `import { invoke } from "@tauri-apps/api/core"` with `import { invoke } from "webtau"`
5. **Add `configure()`** call in your entry point for web mode
6. **Add `webtau-vite`** to your `vite.config.ts`

Total migration: ~30 minutes for a typical game.

## Roadmap

- **v1 (current)**: `wasm_state!` macro, invoke router, Vite plugin, project scaffolder
- **v2**: `#[webtau::command]` proc macro — generates both `#[tauri::command]` and `#[wasm_bindgen]` from a single function definition
- **v2+**: Additional shims (fs → IndexedDB, dialog → `<dialog>`, event → CustomEvent)

## License

MIT OR Apache-2.0
