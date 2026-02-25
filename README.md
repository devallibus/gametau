# gametau

[![npm](https://img.shields.io/npm/v/webtau)](https://npmjs.com/package/webtau)
[![crates.io](https://img.shields.io/crates/v/webtau)](https://crates.io/crates/webtau)
[![CI](https://github.com/devallibus/gametau/actions/workflows/ci.yml/badge.svg)](https://github.com/devallibus/gametau/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/devallibus/gametau)](https://github.com/devallibus/gametau)

**Web tools to build. Rust to power it. Native to ship. Web to spread it.**

Write your game logic once in Rust. Ship native to Steam. Keep the web build for itch.io and GitHub Pages. Develop everything in Chrome with full DevTools and hot-reload.

**For Rust game developers** who want to prototype in the browser with hot-reload and ship native to Steam — without rewriting anything.

**[Play the Pong demo in your browser →](https://devallibus.github.io/gametau/pong/)** — Rust physics, PixiJS rendering, running as WASM. Same code ships as a native desktop app.

| Target | Command | Destination |
|---|---|---|
| **Dev** | `bun run dev` | `localhost:1420` — hot-reload, no Tauri needed |
| **Web** | `bun run build:web` | itch.io, GitHub Pages, any static host |
| **Desktop** | `bun run build:desktop` | Steam-ready native `.exe` / `.dmg` / `.AppImage` |

```typescript
import { invoke } from "webtau";

// Identical call on both platforms. Auto-routes at runtime.
const result = await invoke<TickResult>("tick_world");
```

---

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

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- [Bun](https://bun.sh/) (or Node.js 18+)
- [Tauri CLI](https://v2.tauri.app/start/create-project/) (for desktop builds only)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
bun add -g @tauri-apps/cli    # optional, only for desktop builds
```

---

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

---

## Why gametau?

Tauri is right for the desktop side, but Tauri has no web target — `invoke()` routes through IPC that only exists inside the Tauri process. Without gametau, your dev loop is locked to `tauri dev` and your shareable web build is gone.

gametau gives it all back:

- **Dev in Chrome** — `bun run dev` gives you a fully working game in any browser tab. Full DevTools, fast HMR, shareable dev URLs. Drop into `tauri dev` only when testing desktop-specific behavior.
- **No GC pauses** — Rust has no garbage collector. Your simulation ticks at a consistent cost every frame, not whenever JS decides to collect.
- **2-5x faster for heavy logic** — Physics, pathfinding, large entity counts run measurably faster in WASM than equivalent JS. On desktop, it's full native code with no JS engine in the loop.
- **Portable core** — The `core/` crate has zero framework dependencies. Reuse it for a multiplayer server, a new target, or anywhere else.

| | Pure web (JS only) | gametau |
|---|---|---|
| Ships to Steam | No | Yes |
| Shareable web build | Yes | Yes |
| Heavy simulation | JS + GC limits | WASM / native |
| OS access (saves, files) | Browser APIs only | Full native via Tauri |
| Game state correctness | Runtime surprises | Rust compile-time guarantees |
| Reuse logic on a server | Rewrite in Node | Same `core/` crate |

---

## Packages

gametau ships three things. The scaffolder installs them all for you, but you can also add them individually to an existing project.

### `create-gametau` — Project Scaffolder

Generates a complete Rust + Tauri + Vite project with everything wired up.

```bash
bunx create-gametau my-game              # Three.js (default)
bunx create-gametau my-game -t pixi      # PixiJS
bunx create-gametau my-game -t vanilla   # Canvas2D
```

### `webtau` — Runtime Bridge

Two packages with the same name on different registries — they work together.

```bash
# Frontend: invoke() router that auto-detects Tauri vs browser
bun add webtau

# Rust: wasm_state! macro for WASM thread-local state management
cargo add webtau
```

The npm package gives you `invoke()`, `configure()`, `isTauri()`, and web shims for `@tauri-apps/api/window` and `@tauri-apps/api/dpi`. The Rust crate gives you `wasm_state!` to manage game state in WASM without Tauri's `Mutex<T>`.

### `webtau-vite` — Vite Plugin

Automates wasm-pack builds, watches Rust files for hot-reload, and aliases `@tauri-apps/api/*` imports to their web shims.

```bash
bun add -D webtau-vite
```

Zero config for the standard layout. Add one line to `vite.config.ts`:

```typescript
import webtauVite from "webtau-vite";
export default defineConfig({ plugins: [webtauVite()] });
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
  plugins: [webtauVite()],
});
```

For the standard layout (`src-tauri/wasm`, `src-tauri/core`, etc.), zero config is needed — the plugin auto-detects crate paths and watch directories. Override only for non-standard layouts:

```typescript
webtauVite({
  wasmCrate: "custom/path/to/wasm",
  wasmOutDir: "src/custom-wasm",
  watchPaths: ["extra/rust/src"],
  wasmOpt: true, // release builds only
})
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

**Error behavior (web mode):**

| Situation | Error message |
|---|---|
| `invoke()` before `configure()` | Includes exact `configure()` call pattern to fix it |
| WASM export not found | Lists all available exported function names |
| WASM module fails to load | Calls `onLoadError` callback, then rethrows — next `invoke()` retries the load |

Loading is deduplicated: concurrent `invoke()` calls while the WASM module is still loading share the same promise. After a load failure, the promise is cleared so subsequent calls can retry.

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

**Options (all optional — zero-config works for standard layouts):**

```typescript
webtauVite({
  wasmCrate: "src-tauri/wasm",      // Path to WASM crate (default)
  wasmOutDir: "src/wasm",           // wasm-pack output directory (default)
  watchPaths: [],                    // Extra dirs to watch (sibling crates auto-detected)
  wasmOpt: false,                    // Run wasm-opt on release (default)
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

**[Live demos →](https://devallibus.github.io/gametau/)**

- **[`examples/counter`](./examples/counter)** — Simplest possible example. Counter with increment/decrement/reset that works on both web and desktop.
- **[`examples/pong`](./examples/pong)** — Two-player Pong with Rust physics + PixiJS rendering. Demonstrates real game loop, collision detection, and keyboard input across both targets.

## Migrating an Existing Tauri Game

Install the three packages:

```bash
bun add webtau
bun add -D webtau-vite
cargo add webtau          # in your wasm crate
```

Then:

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

## Support & Commercial Licensing

Gametau is and will always be **100% free** under Apache 2.0 for everyone.

If your commercial game using Gametau reaches more than $100k lifetime revenue, we offer a simple
optional commercial license with a gentle one-time donation (1%, min $2k, max $15k per game, due
within one year). It's our way of saying thank you when things go well.

[Read the commercial license →](docs/COMMERCIAL-LICENSE.md)

Contributors also agree to our friendly [CLA](CLA.md).

Already successful? Just open an issue labeled `commercial license` — happy to help!
