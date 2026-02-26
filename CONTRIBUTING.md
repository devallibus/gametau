# Contributing to Gametau

Thanks for your interest in contributing! This guide will get you oriented quickly.

## Architecture Primer

Gametau follows a 4-crate model (v2) that enforces clean separation between game logic, shared command definitions, and platform bindings.

```
core/       Pure game logic. No framework deps, no Tauri, no WASM.
commands/   Shared command definitions. #[webtau::command] generates both targets.
app/        Tauri desktop shell. Imports commands, registers with generate_handler!.
wasm/       WASM entry point. Links commands crate (exports auto-wired).
```

The **dual-target constraint** is the key design rule: every command must work through both Tauri IPC (native desktop) and direct WASM call (browser). The `#[webtau::command]` proc macro generates both `#[tauri::command]` and `#[wasm_bindgen]` wrappers from a single function definition, so you write each command once in `commands/`.

If your change touches the command surface, make sure it compiles for both native and `wasm32-unknown-unknown` targets.

## Dev Setup

### Prerequisites

- **Rust** (stable) with the `wasm32-unknown-unknown` target:
  ```sh
  rustup target add wasm32-unknown-unknown
  ```
- **wasm-pack**
- **Bun** (recommended) or Node 18+
- **Tauri CLI** (only needed for desktop builds)

### Commands

```sh
# Install JS dependencies
bun install

# Build all packages
bun run build

# Run TypeScript tests
bun test --recursive

# Run Rust tests
cargo test --workspace

# Lint Rust (must pass with zero warnings)
cargo clippy --workspace -- -D warnings
```

### Run the Example

```sh
cd examples/counter && bun run dev
```

## What We Welcome

- Bug fixes
- Window/DPI shim improvements
- New scaffolder templates
- Documentation improvements
- Test coverage expansion

## What Needs Discussion First

Please open an issue before submitting a PR for any of the following:

- Breaking API changes to `invoke()` or `configure()`
- New core dependencies
- Changes to the `#[webtau::command]` proc macro in `webtau-macros`

## PR Process

1. **Open an issue first** for non-trivial changes.
2. **All CI must pass** — Rust clippy + tests, TypeScript tests + type checks.
3. **Use conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, etc.
4. **Keep PRs focused** — one concern per PR.

## CLA

By submitting a PR, you agree to the terms in [CLA.md](CLA.md).
