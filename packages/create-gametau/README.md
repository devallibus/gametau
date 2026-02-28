# create-gametau

Scaffold a Rust game project for the stable Web (WASM) + Tauri desktop path from one codebase.

Electrobun is available as an experimental opt-in track and tracked via [Issue #75](https://github.com/devallibus/gametau/issues/75) and [Milestone v0.5.0-alpha](https://github.com/devallibus/gametau/milestone/8).

> Repository note: `docs/` is intentionally local-only and not published in remote history.

## Quick Start

```bash
bunx create-gametau my-game
cd my-game
bun install
bun run dev
```

For project status and rollout context, see:
- [Milestones](https://github.com/devallibus/gametau/milestones)
- [Issue #75 (runtime flag gate)](https://github.com/devallibus/gametau/issues/75)
- [Issue #84 (example/platform validation evidence)](https://github.com/devallibus/gametau/issues/84)

## Templates

- `three` (default) - Three.js rendering starter
- `pixi` - PixiJS rendering starter
- `vanilla` - Canvas 2D starter

```bash
bunx create-gametau my-game --template pixi
bunx create-gametau my-game --template vanilla
```

## CLI Options

- `--template`, `-t` - Choose scaffold template (`three`, `pixi`, `vanilla`)
- `--help`, `-h` - Show help output
- `--version`, `-v` - Print CLI version

## What gets scaffolded

- `src-tauri/core` - pure Rust game logic
- `src-tauri/commands` - shared command definitions for desktop + web
- `src-tauri/app` - Tauri desktop shell (stable default desktop runtime)
- `src-tauri/wasm` - WASM entry crate
- `src` - frontend app wired to `webtau` and `webtau-vite`
- `src/services` - production-ready service seams for backend invoke calls, persistence/settings, mission session snapshots, and event-driven comms

## Service Layer Contract

The scaffolded base template now ships a small service architecture instead of a single command wrapper:

- `src/services/backend.ts` - typed `invoke()` wrappers for gameplay commands
- `src/services/settings.ts` - runtime settings persistence via `webtau/path` + `webtau/fs`
- `src/services/session.ts` - mission/session snapshot persistence via `webtau/path` + `webtau/fs`
- `src/services/comms.ts` - typed alert/comms channel over `webtau/event`
- `src/services/contracts.ts` - interfaces/types for settings, session snapshots, and alerts

This keeps the generated project lightweight while giving contributors clear extension points for production features.

For full docs and package details, see the main repository:
<https://github.com/devallibus/gametau>
