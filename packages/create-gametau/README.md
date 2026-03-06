# create-gametau

Scaffold a Rust game project for the stable Web (WASM) + Tauri desktop path from one codebase, with optional Electrobun shell support.

Use `--desktop-shell electrobun` to add Electrobun BrowserWindow/GPUWindow shell files and scripts to the generated project.

Electrobun is available as an explicit shell option — see [active milestones](https://github.com/devallibus/gametau/milestones).

> Repository note: `docs/` is intentionally local-only and not published in remote history.

## Quick Start

```bash
bunx create-gametau my-game
bunx create-gametau my-game --desktop-shell electrobun
cd my-game
bun install
bun run dev
```

For project status and rollout context, see [active milestones](https://github.com/devallibus/gametau/milestones).

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
- `--desktop-shell` - Choose desktop shell (`tauri`, `electrobun`)
- `--electrobun-mode` - Electrobun shell mode (`hybrid`, `native`, `dual`)
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

- `src/services/backend.ts` - typed `invoke()` wrappers for gameplay commands plus long-running task lifecycle seams (`startWorldProcessing`, `pollWorldTask`, `cancelWorldTask`)
- `src/services/settings.ts` - runtime settings persistence via `webtau/path` + `webtau/fs`
- `src/services/session.ts` - mission/session snapshot persistence via `webtau/path` + `webtau/fs`
- `src/services/comms.ts` - typed alert/comms channel over `webtau/event`
- `src/services/contracts.ts` - interfaces/types for settings, session snapshots, and alerts

Runtime bootstrap is explicit in scaffolded `src/index.ts`:

- Electrobun path: `bootstrapElectrobunFromWindowBridge()` from `webtau/adapters/electrobun`
- Tauri path: `bootstrapTauri()` from `webtau/adapters/tauri`
- Web path: `configure({ loadWasm })` from `webtau`
- Runtime/capability seam: `getRuntimeInfo()` from `webtau`

This keeps the generated project lightweight while giving contributors clear extension points for production features.

For full docs and package details, see the main repository:
<https://github.com/devallibus/gametau>
