# gametau

A toolkit for building games in Rust that run in the browser (WASM) and on desktop from one codebase.

## Architecture

Monorepo with three main packages:

- **`packages/webtau/`** — TypeScript runtime bridge. Routes `invoke()` to Tauri IPC (desktop) or direct WASM calls (browser). Includes shims for window, fs, dialog, event, path, input, audio, assets.
- **`packages/create-gametau/`** — CLI scaffolder (`bunx create-gametau my-game`).
- **`crates/webtau/`** — Rust crate: `wasm_state!` macro + `#[webtau::command]` re-export.
- **`crates/webtau-macros/`** — Proc macro that generates both `#[tauri::command]` and `#[wasm_bindgen]` wrappers from a single function definition.

## Key Conventions

- **Runtime:** Bun for TypeScript, Cargo for Rust.
- **Tests:** `bun test` (TS), `cargo test --workspace` (Rust).
- **Linting:** `bunx biome check` (TS), `cargo clippy --workspace` (Rust).
- **Imports:** Always `import { invoke } from "webtau"`, never `@tauri-apps/api/core`.
- **Args:** Use snake_case keys when calling `invoke("command", { my_arg: value })`.

## Command Pattern (`#[webtau::command]`)

```rust
#[webtau::command]
pub fn get_score(state: &GameWorld) -> i32 { state.score }

#[webtau::command]
pub fn set_score(state: &mut GameWorld, value: i32) { state.score = value; }
```

- First param must be `&T` (read) or `&mut T` (mutable). Any identifier name works.
- Additional params become named args on the JS side (snake_case).
- Return `T`, `Result<T, E>`, or `()`.
- Generates: native `#[tauri::command]` with `State<Mutex<T>>` + WASM `#[wasm_bindgen]` wrapper.
- **No async**, no `self`, no tuple/struct patterns.

## `wasm_state!(T)` Macro

Generates thread-local state for WASM. Expands to: `set_state(val)`, `with_state(|s| ...)`, `with_state_mut(|s| ...)`, `try_with_state(|s| ...)`, `try_with_state_mut(|s| ...)`.

## Provider Pattern

`CoreProvider` interface enables runtime pluggability (Tauri, Electrobun, custom):
```typescript
registerProvider({ id: "my-runtime", invoke: ..., convertFileSrc: ... });
```

## Error Handling

All failures throw `WebtauError` with structured envelope:
- `code`: `NO_WASM_CONFIGURED` | `UNKNOWN_COMMAND` | `LOAD_FAILED` | `PROVIDER_ERROR` | `PROVIDER_MISSING`
- `runtime`, `command`, `message`, `hint`

## Package Exports (`webtau`)

`.` / `./core` — invoke, configure, isTauri, getRuntimeInfo, registerProvider
`./event` — listen, once, emit, emitTo
`./task` — startTask, pollTask, cancelTask, updateTaskProgress
`./window` — getCurrentWindow (fullscreen, size, title, etc.)
`./fs` — writeTextFile, readTextFile, writeFile, readFile, exists, mkdir, readDir, remove, copyFile, rename
`./dialog` — message, ask, open, save
`./path` — appDataDir, join, basename, dirname, etc.
`./dpi` — LogicalSize, PhysicalSize, LogicalPosition, PhysicalPosition
`./input` — createInputController (keyboard, gamepad, touch, pointer-lock)
`./audio` — resume, suspend, setMuted, setMasterVolume, playTone
`./assets` — loadText, loadJson, loadBytes, loadImage, clear
`./app` — getName, getVersion, getTauriVersion
`./provider` — CoreProvider, WindowAdapter, EventAdapter, FsAdapter, DialogAdapter
`./adapters/tauri` — bootstrapTauri, createTauriCoreProvider, createTauriEventAdapter
`./adapters/electrobun` — bootstrapElectrobun, isElectrobun, getElectrobunCapabilities

## Project Structure (scaffolded)

```
src-tauri/
  core/       — Pure Rust game logic (no framework deps)
  commands/   — #[webtau::command] definitions
  app/        — Tauri desktop shell (generate_handler!)
  wasm/       — WASM entry point (links commands crate)
src/
  services/backend.ts  — Typed invoke() wrappers
  game/scene.ts        — Renderer (Three.js/PixiJS/Canvas2D)
vite.config.ts         — webtau-vite plugin
```

## Full API Reference

See `llms-full.txt` in the repo root for the complete API surface.
