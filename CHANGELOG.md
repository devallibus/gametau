# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
