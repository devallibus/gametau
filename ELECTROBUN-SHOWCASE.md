# Electrobun x gametau Showcase

This is the quickest way to try gametau running in Electrobun after the upstream WGPU release.

## What this covers

gametau now supports two Electrobun shell shapes:

- `BrowserWindow` for the current web-first app path
- `GpuWindow` for a native WGPU shell that still reuses the shared Rust/WASM backend loop

The fastest reference example is [`examples/electrobun-counter`](./examples/electrobun-counter).

## Try it in 2 minutes

From repo root:

```bash
bun install
bun run --cwd packages/webtau build
bun run --cwd packages/webtau-vite build
```

Launch the BrowserWindow path:

```bash
bun run --cwd examples/electrobun-counter dev:electrobun:browser
```

Launch the GPUWindow path:

```bash
bun run --cwd examples/electrobun-counter dev:electrobun:gpu
```

What you should see:

- Browser mode: a native Electrobun window loads the Vite app and the counter UI works normally.
- GPU mode: a native `GpuWindow` opens and the shared counter state advances through the WASM-backed game loop.

## Scaffold a project

```bash
bunx create-gametau my-game --desktop-shell electrobun
bunx create-gametau my-game --desktop-shell electrobun --electrobun-mode dual
```

The generated scaffold keeps the web/Tauri path intact and adds:

- `electrobun.config.ts`
- `src/bun/browser.ts`
- `src/bun/gpu.ts`
- `dev:electrobun` / `build:electrobun` scripts

## Build desktop packages

```bash
bun run --cwd examples/electrobun-counter build:electrobun:browser
bun run --cwd examples/electrobun-counter build:electrobun:gpu
```

## Shared state note

Chrome, Tauri, BrowserWindow Electrobun, and GPUWindow Electrobun are separate runtimes. They do not share in-memory state automatically. If you need continuity across runtimes, use a shared backend or persistence layer.

## Useful links

- Electrobun WGPU announcement: https://blackboard.sh/blog/wgpu-in-electrobun/
- Tracking issue: [#159](https://github.com/devallibus/gametau/issues/159)
- Hybrid showcase issue: [#160](https://github.com/devallibus/gametau/issues/160)
- Render-mode capability issue: [#161](https://github.com/devallibus/gametau/issues/161)
