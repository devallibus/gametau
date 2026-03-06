# Runtime Support

This document describes which runtimes gametau supports, to what level, and how to validate them.

## Stable runtimes

Both targets are production-ready and covered by CI, publish preflight, and consumer smoke on every release.

**Web (WASM)**
- Commands invoked directly as WASM exports
- Events via `CustomEvent` DOM bridge
- Task lifecycle (`startTask`, `pollTask`, `cancelTask`) with non-blocking state tracking
- Structured diagnostics (`WebtauError` with `code`, `runtime`, `command`, `message`, `hint`)
- Filesystem, dialog, app, path, and event shims for `@tauri-apps/api` compatibility

**Desktop (Tauri)**
- Commands invoked via Tauri IPC
- Events via Tauri event bus, bridged through `createTauriEventAdapter()`
- Task lifecycle seams in the default scaffold (`src/services/backend.ts`)
- Full Tauri API passthrough (no shims required)

## Supported explicit shell

**Desktop (Electrobun)** - opt-in via explicit shell selection

Use one of:

```bash
bunx create-gametau my-game --desktop-shell electrobun
bunx create-gametau my-game --desktop-shell electrobun --electrobun-mode dual
```

Current supported shapes:

- `BrowserWindow` shell with embedded `<electrobun-wgpu>` for hybrid UI/native-render composition
- `GpuWindow` shell for native WGPU windows that still reuse the shared WASM backend loop

Reference example:

```bash
bun run --cwd examples/electrobun-counter dev:electrobun:hybrid
bun run --cwd examples/electrobun-counter dev:electrobun:gpu
```

## Capability matrix

| Capability | Web (WASM) | Desktop (Tauri) | Desktop (Electrobun) |
|---|---|---|---|
| `invoke()` | Direct WASM export | Tauri IPC | WASM or provider bridge |
| `listen()` / `emit()` | `CustomEvent` DOM | Tauri event bus | Provider bridge |
| Runtime detection | `configure()` path | `isTauri()` / `bootstrapTauri()` | `bootstrapElectrobunFromWindowBridge()` |
| Task lifecycle | Stable | Stable | Supported |
| Structured diagnostics | `WebtauError` envelope | `WebtauError` envelope | `WebtauError` envelope |
| Filesystem shims | IndexedDB-backed | Native via Tauri | Supported through adapter surface |
| Dialog shims | `<dialog>` element | Native via Tauri | Supported through adapter surface |
| Window control | Browser APIs | Native via Tauri | Supported through adapter surface |
| Native WGPU shell | N/A | N/A | `GpuWindow` proof path |

## Known gaps

- `resolveResource()` in `webtau/path` is not yet implemented for web mode.
- The current GPUWindow proof path validates shared backend reuse, not a full renderer abstraction.

## Validating integration readiness

To validate that a gametau integration works end to end before shipping, use the scenario runbook in [`INTEGRATION-PROXY-VALIDATION.md`](./INTEGRATION-PROXY-VALIDATION.md). It covers eight validation scenarios (scaffold boot, command extension, persistence, diagnostics, task lifecycle, event parity, and more) using only public repository assets.

Release gate requirements and enforcement are in [`.github/release/RELEASE-GATE-CHECKLIST.md`](./.github/release/RELEASE-GATE-CHECKLIST.md).
