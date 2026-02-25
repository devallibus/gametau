# gametau

**Web tools to build. Rust to power it. Native to ship. Web to spread it.**

---

You want to build games with web tools — Three.js, PixiJS, Canvas2D. The dev experience is unmatched: instant hot-reload, real browser DevTools, and when something works you just send someone the URL and they're playing it in two seconds. No install. No "wait let me build it." That instant shareability is something no native toolchain has ever matched, and it's why vibe-coded web games spread the way they do.

But you also want the game to be *good*. Fast. Native-feeling. Rust-powered logic with no GC pauses tanking your framerate at 200 entities. Real save files. A Steam page. A `.exe` someone can download and run without a browser.

Those two things used to be mutually exclusive. You could have the web dev experience and the distribution superpower — or you could have performance and a native desktop build. Not both.

The usual answer is Tauri, and Tauri is right for the desktop side. But the moment you build your game logic in Rust for Tauri, your web build is gone. Tauri has [no web target](https://github.com/nicholasgasior/tauri/issues/8248) and won't get one. `invoke()` calls route through Tauri IPC — which only exists inside the Tauri process — so opening your game in a real browser tab just breaks. Your dev loop is now locked to `tauri dev`. Your shareable URL is gone. The thing that made web game dev special is gone.

**gametau gives it all back.** Write your game logic once in Rust. Ship it native to Steam. Keep the web build for itch.io and GitHub Pages. And develop the whole thing in Chrome, with full DevTools and hot-reload, exactly the way you would have before.

```typescript
import { invoke } from "webtau";

// Identical call on both platforms. Auto-routes at runtime.
const result = await invoke<TickResult>("tick_world");
```

Your dev loop never leaves the browser. When you're ready to ship, you add a flag:

| Target | Command | Destination |
|---|---|---|
| **Dev** | `bun run dev` | `localhost:1420` — hot-reload, no Tauri needed |
| **Web** | `bun run build:web` | itch.io, GitHub Pages, any static host |
| **Desktop** | `bun run build:desktop` | Steam-ready native `.exe` / `.dmg` / `.AppImage` |

You get the fast, familiar web dev experience while you build — and a real desktop app ready for Steam when you ship.

---

## Dev in Chrome. Drop into Tauri only when you need to.

This is the part that changes your daily workflow the most.

If you build a Rust-core Tauri game without gametau, you're locked to the Tauri shell during development. The Chrome instance Tauri spins up is just the app window — open `localhost:1420` in your actual browser and nothing works. Every `invoke()` call routes through Tauri IPC, which only exists inside the running Tauri process. So your entire dev loop depends on `tauri dev`: wait for Rust to compile, wait for the Tauri window to start, restart whenever something changes. Your own browser is useless.

With gametau, `bun run dev` gives you a fully working game in any browser tab. The Vite plugin builds WASM automatically and `invoke()` routes to it directly — no Tauri process, no desktop window, no waiting. You get:

- **Full Chrome DevTools** — sources, performance profiler, memory, network, everything
- **Fast HMR** — Vite hot-reloads your frontend instantly; Rust changes rebuild WASM and trigger a full reload automatically
- **Shareable dev URLs** — send `localhost:1420` to a teammate and they can play the current build without installing Tauri or Rust
- **Immediate feedback** — iterate on gameplay feel entirely in the browser, at browser speeds

You drop into `tauri dev` only when you actually need to test desktop-specific behavior: native save files, OS notifications, window management, or doing a final check before your Steam build. Until then, your browser is the dev environment it should have been all along.

---

## Why Rust for game logic?

The obvious question: why not just keep everything in JavaScript?

**Garbage collection pauses at the worst moments.** JS's GC runs whenever it decides to — and for games, a 10ms stall at 60fps is a dropped frame right when your player lands a hit. Rust has no GC. Your simulation ticks at a consistent, predictable cost every frame.

**WASM is measurably faster for heavy game logic.** Physics, pathfinding, large entity counts, world simulation — computation-heavy code runs 2–5× faster in WASM than equivalent JS. That's the difference between a 200-entity simulation running smoothly and stuttering. And in WASM, you're already writing Rust — so the gametau wrappers add essentially zero overhead.

**Desktop gets the full native advantage.** When your game runs through Tauri, there's no JS engine in the loop at all. Your `core/` logic compiles to native code. Combined with Tauri's OS access — real filesystem, native save files, system notifications — your Steam build can do things a browser game simply cannot.

**Your core logic is yours to keep.** The `core/` crate has zero framework dependencies — no Tauri, no WASM, no gametau. It's pure game logic. When you want to add a multiplayer server, it uses the same `core/`. When you add a new target, same `core/`. Your logic isn't locked to any platform or runtime.

Compared to staying pure web with no Rust layer at all:

| | Pure web (JS only) | gametau |
|---|---|---|
| Ships to Steam | ✗ no native binary | ✓ |
| Shareable web build | ✓ | ✓ |
| Heavy simulation | Hits JS + GC limits | WASM in browser / native on desktop |
| OS access (saves, files) | Limited to browser APIs | Full native access via Tauri |
| Game state correctness | Runtime surprises | Rust compile-time guarantees |
| Reuse logic on a server | Rewrite in Node | Same `core/` crate |

The Rust layer isn't a tax you pay to get to Tauri. It's the reason the game is faster, safer, and worth shipping.

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

## Support & Commercial Licensing

Gametau is and will always be **100% free** under Apache 2.0 for everyone.

If your commercial game using Gametau reaches more than $100k lifetime revenue, we offer a simple
optional commercial license with a gentle one-time donation (1%, min $2k, max $15k per game, due
within one year). It's our way of saying thank you when things go well.

[Read the commercial license →](docs/COMMERCIAL-LICENSE.md)

Contributors also agree to our friendly [CLA](CLA.md).

Already successful? Just open an issue labeled `commercial license` — happy to help!
