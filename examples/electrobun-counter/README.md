# Electrobun Counter

This example is the reference Electrobun showcase for gametau.

It covers two shell shapes:

- `BrowserWindow` for the web-first counter UI
- `GpuWindow` for a native WGPU shell that still reuses the shared counter WASM backend

## Run

Install dependencies:

```bash
bun install
```

Start the BrowserWindow path:

```bash
bun run dev:electrobun:browser
```

Start the GPUWindow path:

```bash
bun run dev:electrobun:gpu
```

## Runtime behavior

- Browser mode loads the normal Vite app and auto-checks for `window.__ELECTROBUN__`.
- If no Electrobun bridge is exposed, the browser shell still falls back cleanly to the normal WASM path.
- GPU mode configures `webtau` directly in the Bun runtime, loads the same counter WASM module, and advances the shared counter state inside a native `GpuWindow`.

## Build

```bash
bun run build:web
bun run build:electrobun:browser
bun run build:electrobun:gpu
```
