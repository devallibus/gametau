---
name: webtau-command-macro
description: Use when writing Rust commands for gametau, using #[webtau::command] or wasm_state! macro, defining game state, or working with dual-target WASM and Tauri codegen.
---

# Rust Command Macro & State Management

## `#[webtau::command]` — Dual-Target Codegen

Write one function, get both Tauri and WASM wrappers generated automatically.

```rust
#[webtau::command]
pub fn get_score(state: &GameWorld) -> i32 {
    state.score
}

#[webtau::command]
pub fn set_score(state: &mut GameWorld, value: i32) {
    state.score = value;
}

#[webtau::command]
pub fn save_game(state: &GameWorld, slot: i32) -> Result<String, GameError> {
    state.save_to_slot(slot)
}
```

### Contract

| Rule | Detail |
|---|---|
| First param | `name: &T` (read) or `name: &mut T` (write). Any identifier. |
| Extra params | Named, typed values → JS args in snake_case |
| Return | `T` (Serialize), `Result<T, E>`, or `()` |
| Not supported | `async`, `self`, tuple/struct patterns, `__webtau` prefix names |

### What Gets Generated

**Native (`#[cfg(not(wasm32))]`):**
- `#[tauri::command(rename_all = "snake_case")]` wrapper
- `State<Mutex<T>>` parameter injected by Tauri
- Mutex lock uses `unwrap_or_else(|p| p.into_inner())` — non-panicking on poisoned mutex

**WASM (`#[cfg(wasm32)]`):**
- `#[wasm_bindgen]` wrapper
- Args deserialized from `JsValue` via `serde_wasm_bindgen`
- State accessed via `try_with_state` / `try_with_state_mut` — returns `JsError` if uninitialized
- All paths return `Result<_, JsError>` — no panics

## `wasm_state!(T)` — Thread-Local State for WASM

```rust
use webtau::wasm_state;

struct GameWorld { score: i32 }
wasm_state!(GameWorld);

// In your init function:
#[wasm_bindgen]
pub fn init() { set_state(GameWorld { score: 0 }); }
```

### Generated Functions

| Function | Signature | Behavior |
|---|---|---|
| `set_state` | `fn set_state(val: T)` | Initialize or replace state |
| `with_state` | `fn with_state<F, R>(f: F) -> R` | Read-only access. **Panics** if uninitialized. |
| `with_state_mut` | `fn with_state_mut<F, R>(f: F) -> R` | Mutable access. **Panics** if uninitialized. |
| `try_with_state` | `fn try_with_state<F, R>(f: F) -> Option<R>` | Read-only. Returns `None` if uninitialized. |
| `try_with_state_mut` | `fn try_with_state_mut<F, R>(f: F) -> Option<R>` | Mutable. Returns `None` if uninitialized. |

The `try_*` variants are used by generated WASM wrappers to avoid panics.

## Crate Layout

```
src-tauri/
  core/src/lib.rs         # Pure game logic (no framework deps)
  commands/src/
    lib.rs                # Re-exports: pub use commands::{...}
    commands.rs           # #[webtau::command] + wasm_state! + init()
  app/src/lib.rs          # generate_handler![...] + Mutex state
  wasm/src/lib.rs         # use my_game_commands as _;
```

### commands.rs Pattern

```rust
use my_game_core::{GameWorld, WorldView, TickResult};

#[cfg(target_arch = "wasm32")]
webtau::wasm_state!(GameWorld);

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn init() { set_state(GameWorld::new()); }

#[webtau::command]
pub fn get_world_view(state: &GameWorld) -> WorldView {
    state.view()
}

#[webtau::command]
pub fn tick_world(state: &mut GameWorld) -> TickResult {
    state.tick()
}
```

### lib.rs Re-export Pattern

```rust
mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{get_world_view, tick_world};

#[cfg(target_arch = "wasm32")]
pub use commands::{init, get_world_view, tick_world};
```

## Common Mistakes

1. **Commands at crate root** — place in a submodule to avoid conflicts with Tauri's `#[macro_export]`
2. **Missing cfg gates** — `wasm_state!` and `init()` need `#[cfg(target_arch = "wasm32")]`
3. **Forgetting re-exports** — `wasm/src/lib.rs` needs `use my_commands as _;` to link exports
4. **Using panicking state access** — WASM wrappers use `try_with_state` (the macro handles this)
5. **Async commands** — `#[webtau::command]` does not support async; compute synchronously or use tasks
