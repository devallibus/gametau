# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-03-04

### Breaking
- `#[webtau::command]` generated native wrappers now apply `#[tauri::command(rename_all = "snake_case")]`, so desktop IPC argument keys must be snake_case.
- Migration: update Tauri `invoke()` payload keys from camelCase to snake_case (for example, `{ numSamples: 16 }` -> `{ num_samples: 16 }`).

### Fixed
- `webtau-macros` now generates `#[tauri::command(rename_all = "snake_case")]` for `#[webtau::command]` native wrappers, aligning Tauri IPC argument keys with WASM serde snake_case behavior.

## [0.5.2] - 2026-03-01

### Added
- Node ESM consumer smoke script (`scripts/smoke-webtau-esm-consumer.mjs`) to validate `webtau` importability from packed tarballs in clean environments.
- Package-level smoke hook in `webtau`: `npm run smoke:esm-consumer`.

### Changed
- CI publish preflight and tag-time publish flow now run Node ESM consumer smoke before npm pack/publish steps.

## [0.5.1] - 2026-03-01

### Fixed
- Internal ESM relative imports in `webtau` now use explicit `.js` specifiers, fixing `ERR_MODULE_NOT_FOUND` when consuming `webtau` from Node in `0.5.0`. See [#109](https://github.com/devallibus/gametau/issues/109).

## [0.5.0] - 2026-03-01

### Added
- `webtau/task` lifecycle surface: `startTask`, `pollTask`, `cancelTask`, and progress helpers for non-blocking long-running operations.
- `webtau/adapters/tauri` adapter bootstrap: `bootstrapTauri()`, `createTauriCoreProvider()`, `createTauriEventAdapter()` for explicit Tauri event and invoke wiring.
- Structured diagnostics envelope (`WebtauError` with `code`, `runtime`, `command`, `message`, `hint`) throughout the runtime bridge and WASM command wrappers.
- Runtime provider contracts in `webtau/provider`: `CoreProvider`, `WindowAdapter`, `EventAdapter`, `FsAdapter`, `DialogAdapter`.
- Provider registry APIs in `webtau/core`: `registerProvider`, `getProvider`, `resetProvider` with lazy Tauri auto-registration.
- Adapter override hooks in `webtau/window`, `webtau/event`, `webtau/fs`, and `webtau/dialog`.
- Experimental Electrobun runtime as an opt-in trial path (install with `webtau@alpha`; not the default scaffold target). See `examples/electrobun-counter` and [active milestones](https://github.com/devallibus/gametau/milestones).

### Changed
- `create-gametau` base scaffold now wires `bootstrapTauri()` in desktop mode and ships task lifecycle seams in `src/services/backend.ts`.
- API docs generation now covers all public `webtau` entrypoints including `task`, `provider`, and `adapters/*`.
- `webtau/path` docs corrected: `delimiter` shipped in `0.4.0`; only `resolveResource` remains unimplemented.

## [0.4.0] - 2026-02-27

### Added
- `convertFileSrc()` web shim in `webtau/core` for asset URL passthrough.
- `delimiter()`, `cacheDir()`, `configDir()`, `dataDir()`, `localDataDir()` web shims in `webtau/path`.
- `getIdentifier()` / `setAppIdentifier()` web shim in `webtau/app`.
- `copyFile()` and `rename()` virtual filesystem operations in `webtau/fs`.
- Workspace lint baseline with Biome plus CI enforcement.
- Battlestation scenario smoke coverage in CI.

### Fixed
- API docs artifact uploads now validate outputs and include hidden directories, preventing false-green publish runs.

## [0.3.1] - 2026-02-27

### Added
- Battlestation radar renderer migrated from Canvas2D to Three.js with improved visual polish.

### Changed
- Battlestation now uses responsive layout and DPR-aware canvas sizing for sharper rendering across viewport sizes.

### Fixed
- `webtau-vite` now falls back gracefully when `wasm-pack` is unavailable but valid prebuilt artifacts exist in `wasmOutDir`, allowing web builds and dev startup to continue without a fresh compile.
- Fallback validation is stricter: requires a paired `*_bg.wasm` and loader `.js`; fails fast when reusable artifacts are missing or incomplete.
- Rust watch rebuilds are clearly disabled in fallback mode; `wasm-pack` remains required for fresh WASM builds and the hot-reload loop.

## [0.3.0] - 2026-02-27

### Added
- Battlestation flagship showcase (`examples/battlestation`) — full module coverage (`input`, `audio`, `assets`, `fs/path`, `event`, `app`) running across web and desktop.
- `webtau/app` and `webtau/path` runtime parity shims, plus `webtau-vite` alias coverage for both.
- `create-gametau` templates now include a production-oriented service layer (`settings`, `session`, `comms`, and shared contracts) as extension seams.

## [0.2.1] - 2026-02-26

### Added
- Web parity shims for `@tauri-apps/api` modules: `fs`, `dialog`, and `event`.
- Gameplay foundation modules: `webtau/input`, `webtau/audio`, and `webtau/assets`.
- Pong example exercising input, audio, and asset loading together.

### Fixed
- PR-time scaffold smoke now rewrites scaffolded Rust `webtau` dependencies to the local workspace crate so CI validates unreleased lines before crates.io publish.

## [0.1.4] - 2026-02-26

### Fixed
- Hyphenated scaffold names now generate valid Rust module identifiers in templates (e.g. `my-game` → `my_game`).

## [0.1.3] - 2026-02-26

### Fixed
- Scaffolded template Rust builds no longer fail on `wasm32-unknown-unknown` due to `getrandom` feature gating.
- Consumer smoke now completes scaffold, install, and build steps for newly published `create-gametau` templates.

## [0.1.2] - 2026-02-26

### Fixed
- `create-gametau` now executes correctly when launched through `node_modules/.bin` shims (previously could silently exit `0`).
- Release verification now asserts CLI version output and fails if `create-gametau` does not execute.
- Consumer smoke now verifies the scaffolded directory exists immediately after CLI invocation.

## [0.1.1] - 2026-02-26

### Added
- CI now enforces MSRV `1.77` with a dedicated workflow job.
- Publish workflow verifies npm and crates.io artifacts after release before declaring success.
- Publish workflow includes a registry consumer smoke test and manual `workflow_dispatch` verification path.

## [0.1.0] - 2026-02-26

First stable release. Deploy Tauri games to web and desktop from one codebase.

### Added
- **`webtau` npm package** — `invoke()` universal router with automatic Tauri/WASM detection, `isTauri()` runtime check, window shims, and DPI utilities.
- **`webtau-vite` npm package** — Vite plugin with wasm-pack automation, Rust file watching, `@tauri-apps/api` import aliasing, and optional wasm-opt.
- **`create-gametau` CLI** — project scaffolder with Three.js, PixiJS, and vanilla Canvas2D templates; generates a ready-to-run 4-crate Rust workspace (`core`, `commands`, `app`, `wasm`).
- **`webtau` Rust crate** — `#[webtau::command]` proc macro generating both `#[tauri::command]` and `#[wasm_bindgen]` wrappers from a single function, and `wasm_state!` macro for WASM thread-local state.
- **`webtau-macros` Rust crate** — proc macro internals for `#[webtau::command]`.
- `examples/counter` — minimal end-to-end demo (browser WASM + Tauri desktop).
- `examples/pong` — two-player Pong with Rust physics, PixiJS rendering, and keyboard input.
