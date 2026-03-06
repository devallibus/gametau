# Battlestation

Battlestation is the heavier Electrobun follow-up after the counter proofs.

It now supports:

- web / Tauri with the original DOM HUD + audio path
- Electrobun `BrowserWindow` with the same web-first path
- Electrobun `GpuWindow` with the shared mission loop and native Three WebGPU rendering

## Run

BrowserWindow shell:

```bash
bun run dev:electrobun:browser
```

GPUWindow shell:

```bash
bun run dev:electrobun:gpu
```

## Current GPUWindow limitations

The GPUWindow path is intentionally narrower than the browser shell:

- no HTML HUD overlay in native mode
- no Web Audio tone playback in native mode yet
- mission status is surfaced through the window title and console alerts
- keyboard + mouse controls are implemented directly through Electrobun window/screen APIs

That split is deliberate: the mission orchestration is now shared, while rendering/input are runtime-specific adapters.

## Build

```bash
bun run build:web
bun run build:electrobun:browser
bun run build:electrobun:gpu
```
