# Electrobun Counter

This example is the reference Electrobun showcase for gametau.

It covers two shell shapes:

- `BrowserWindow` + embedded `<electrobun-wgpu>` for the hybrid UI/render split
- `GpuWindow` for a native WGPU shell that still reuses the shared counter WASM backend

## Run

Install dependencies:

```bash
bun install
```

Start the hybrid BrowserWindow path:

```bash
bun run dev:electrobun:hybrid
```

Start the GPUWindow path:

```bash
bun run dev:electrobun:gpu
```

## Runtime behavior

- Hybrid mode loads the normal Vite app, auto-checks for `window.__ELECTROBUN__`, and embeds a native WGPU surface via `<electrobun-wgpu>`.
- The example keeps HTML HUD/buttons in the webview while the native surface is resized and masked underneath it.
- If no Electrobun bridge is exposed, the browser shell still falls back cleanly to the normal WASM path.
- GPU mode configures `webtau` directly in the Bun runtime, loads the same counter WASM module, and advances the shared counter state inside a native `GpuWindow`.

## Why this exists

This hybrid path is the lowest-risk step before deeper GPU-only renderer work:

- it proves DOM UI and native rendering can coexist in one BrowserWindow
- it exercises resize, masking, and click-routing without abandoning current web-first app structure
- it gives a migration step for richer apps before pure `GpuWindow` renderer abstractions

## Build

```bash
bun run build:web
bun run build:electrobun:hybrid
bun run build:electrobun:gpu
```
