# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0-alpha.2] - 2026-02-27

### Added
- Runtime parity shims for `@tauri-apps/api/app` and `@tauri-apps/api/path` (`webtau/app`, `webtau/path`)
- `webtau-vite` alias coverage for `@tauri-apps/api/app` and `@tauri-apps/api/path`
- Public function-level parity documentation in `docs/PARITY-MATRIX.md`

### Fixed
- Prerelease version alignment so tag-triggered publish uses unreleased `0.3.0-alpha.2` manifests instead of previously published `0.2.1` versions
- `webtau/app` setter signatures now accept `null` reset values without type-unsafe casts in tests

### Changed
- Workspace, crate, and npm package versions bumped to `0.3.0-alpha.2`
- `create-gametau` template dependencies now target `webtau`/`webtau-vite` `^0.3.0-alpha.2` and Rust `webtau = "0.3.0-alpha.2"`

## [0.2.1] - 2026-02-26

### Added
- New onboarding and operations docs: scaffold-to-playable tutorial, release incident response checklist, and automated API docs publication path
- Web parity shims for `@tauri-apps/api` modules: `fs`, `dialog`, and `event`
- Gameplay foundation modules in `webtau`: `input`, `audio`, and `assets`
- Pong example integration path that exercises input, audio, and asset loading together

### Fixed
- PR-time scaffold smoke now rewrites scaffolded Rust `webtau` dependencies to the local workspace crate so CI can validate unreleased lines before crates.io publish

### Changed
- `create-gametau` templates now target `webtau`/`webtau-vite` `^0.2.0` and Rust `webtau = "0.2"` for scaffolded projects
- README roadmap now reflects `0.2.x` as the current stable line
- Release versions bumped to `0.2.1` for `webtau`, `webtau-vite`, `create-gametau`, `webtau`, and `webtau-macros`

## [0.1.4] - 2026-02-26

### Fixed
- Hyphenated scaffold names now generate valid Rust module identifiers in templates (e.g. `my-game` → `my_game`) for commands/app/wasm imports
- Consumer smoke builds now work with the existing `smoke-game` scaffold target name

### Changed
- Scaffolder now applies Rust identifier normalization for `{{PROJECT_NAME}}_` template usages while preserving display/package names
- Release versions bumped to `0.1.4` for `webtau`, `webtau-vite`, `create-gametau`, `webtau`, and `webtau-macros`

## [0.1.3] - 2026-02-26

### Fixed
- Scaffolded template Rust builds no longer fail on `wasm32-unknown-unknown` due to `getrandom` feature gating from `rand` defaults
- Consumer smoke now progresses through scaffold/install/build for newly published `create-gametau` templates

### Changed
- Template `rand` dependency now disables default features and enables only `std` + `std_rng`
- Release versions bumped to `0.1.3` for `webtau`, `webtau-vite`, `create-gametau`, `webtau`, and `webtau-macros`

## [0.1.2] - 2026-02-26

### Fixed
- `create-gametau` now executes correctly when launched through npm-style `node_modules/.bin` shims (previously it could no-op and exit `0`)
- Release verification now asserts CLI version output and fails if `create-gametau` does not actually execute
- Consumer smoke scaffolding now verifies the scaffolded directory exists immediately after CLI invocation

### Changed
- Release versions bumped to `0.1.2` for `webtau`, `webtau-vite`, `create-gametau`, `webtau`, and `webtau-macros`

## [0.1.1] - 2026-02-26

### Added
- CI now enforces MSRV `1.77` with a dedicated `MSRV (1.77)` workflow job
- Publish workflow now verifies npm/crates.io artifacts after release before declaring success
- Publish workflow now includes a registry consumer smoke test and manual `workflow_dispatch` verification path

### Changed
- `webtau` and `webtau-macros` now inherit `rust-version` from workspace metadata for published crate manifests
- Release versions bumped to `0.1.1` for `webtau`, `webtau-vite`, `create-gametau`, `webtau`, and `webtau-macros`

## [0.1.0] - 2026-02-26

First stable release. Deploy Tauri games to web + desktop from one codebase.

### Highlights
- **`webtau` npm package** — `invoke()` universal router with automatic Tauri/WASM detection, `isTauri()` runtime check, window shims, and DPI utilities
- **`webtau-vite` npm package** — Vite plugin with wasm-pack automation, Rust file watching, `@tauri-apps/api` import aliasing, and optional wasm-opt
- **`create-gametau` CLI** — project scaffolder with Three.js, PixiJS, and vanilla Canvas2D templates
- **`webtau` Rust crate** — `#[webtau::command]` proc macro (generates `#[tauri::command]` + `#[wasm_bindgen]` from one function) and `wasm_state!` macro for WASM thread-local state
- **`webtau-macros` Rust crate** — proc macro internals for `#[webtau::command]`

### Published Artifacts
- npm: `webtau`, `webtau-vite`, `create-gametau` (all `0.1.0`)
- crates.io: `webtau`, `webtau-macros` (both `0.1.0`)

### Changed
- All template dependency pins switched from prerelease to stable (`^0.1.0` for npm, `0.1` for Cargo)

## [0.1.0-alpha.5] - 2026-02-26

### Fixed
- `create-gametau` now ships a dotless `gitignore` file so `npm pack` includes it
- Packaged CLI regressions guarded with smoke tests
- `dist/` test guard skips tests when dist is not built

### Added
- Hardened packaged CLI smoke checks in CI
- README logo

### Removed
- Unused `minimal-game` test fixture

### Changed
- Release versions bumped to `0.1.0-alpha.5` across all artifacts

## [0.1.0-alpha.4] - 2026-02-26

### Fixed
- Retry guard quoting in `webtau` crate publish workflow
- Already-published crates now treated as success instead of failing the pipeline
- Retry logic for `webtau` publish on crates.io index propagation lag

### Changed
- Release versions bumped to `0.1.0-alpha.4` across all artifacts

## [0.1.0-alpha.3] - 2026-02-26

### Added
- CI publish preflight job with Rust/npm dry-run checks (`cargo publish --dry-run`, `npm pack --dry-run`)
- Contributor guidance for prerelease template pinning and stable-switch policy

### Changed
- Release versions bumped to `0.1.0-alpha.3` across workspace crates, npm packages, and scaffolder templates
- Smoke CI step names were clarified for faster diagnostics
- Web crate preflight logic now handles prerelease dependency checks safely during CI

### Release Proof
- Tag: `v0.1.0-alpha.3`
- Publish workflow run: https://github.com/devallibus/gametau/actions/runs/22446985795
- Published npm packages:
  - `webtau@0.1.0-alpha.3`
  - `webtau-vite@0.1.0-alpha.3`
  - `create-gametau@0.1.0-alpha.3`
- Published crates:
  - `webtau-macros 0.1.0-alpha.3`
  - `webtau 0.1.0-alpha.3`
- Note: workflow publish partially failed due registry-side trusted publisher auth mismatch for `webtau-vite` and `webtau-macros`; missing artifacts were published manually and verified.

## [0.1.0-alpha.2] - 2026-02-26

### Added
- `#[webtau::command]` v2 proc macro — generates both `#[tauri::command]` and `#[wasm_bindgen]` wrappers from a single function definition
- Scaffolder now generates v2 4-crate structure (core, commands, app, wasm)

### Fixed
- Landing page template flag corrected from `threejs` to `three` to match CLI behavior
- Contributor docs updated to reflect v2 architecture and command flow

### Changed
- Rust publish workflow now handles `webtau-macros` before `webtau` for correct dependency order
- Rust publish workflow now polls crates.io index propagation before publishing dependent crates
- `webtau-macros` crate is now publishable to crates.io
- npm publish workflow now uses `--tag alpha` for prerelease releases
- CI now includes scaffold and web build smoke checks on pull requests
- All package versions aligned to `0.1.0-alpha.2` (npm + crates.io)
- Scaffolder templates now pin Rust `webtau` dependency to `0.1.0-alpha.2`
- Added `.claude/`, `.cursor/plans/`, `.instance/` to `.gitignore` for cleaner local status

## [0.1.0-alpha.1] - 2025-06-14

### Added
- `webtau` npm package: `invoke()` universal router with automatic Tauri/WASM detection, `isTauri()` runtime check, WASM module deduplication and retry logic
- `webtau/window`: `WebWindow` shim for `@tauri-apps/api/window` (fullscreen, size, title, monitor, scale factor, decorations, center)
- `webtau/dpi`: `LogicalSize`, `PhysicalSize`, `LogicalPosition`, `PhysicalPosition` with conversion methods
- `webtau-vite` npm package: Vite plugin with wasm-pack automation, Rust file watching, `@tauri-apps/api` import aliasing, optional wasm-opt
- `create-gametau` npm package: project scaffolder CLI with Three.js, PixiJS, and vanilla Canvas2D templates
- `webtau` Rust crate: `wasm_state!` macro for WASM thread-local state management (`set_state`, `with_state`, `with_state_mut`)
- `examples/counter`: end-to-end working demo (browser WASM + Tauri desktop)
- `examples/pong`: two-player Pong with Rust physics, PixiJS rendering, and keyboard input
- GitHub CI: Rust (clippy + tests) and TypeScript (bun test + tsc) pipelines
- Apache-2.0 license with optional commercial license for high-revenue games
