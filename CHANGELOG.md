# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
