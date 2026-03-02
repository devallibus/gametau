# Runtime Support

This document describes which runtimes gametau supports, to what level, and how to validate them.

## Stable runtimes

Both targets are production-ready and covered by CI, the publish preflight, and consumer smoke tests on every release.

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

## Experimental runtimes

**Desktop (Electrobun)** — opt-in only, not the default scaffold target

Install explicitly to trial:

```bash
npm install webtau@alpha webtau-vite@alpha create-gametau@alpha
```

See `examples/electrobun-counter` for a working trial path. Rollout is tracked in [active milestones](https://github.com/devallibus/gametau/milestones).

## Capability matrix

| Capability | Web (WASM) | Desktop (Tauri) | Desktop (Electrobun) |
|---|---|---|---|
| `invoke()` | Direct WASM export | Tauri IPC | Provider bridge |
| `listen()` / `emit()` | `CustomEvent` DOM | Tauri event bus | Provider bridge |
| Task lifecycle | Stable | Stable | Experimental |
| Structured diagnostics | `WebtauError` envelope | `WebtauError` envelope | `WebtauError` envelope |
| Filesystem shims | IndexedDB-backed | Native via Tauri | Experimental |
| Dialog shims | `<dialog>` element | Native via Tauri | Experimental |
| Window shims | Browser APIs | Native via Tauri | Experimental |

## Known gaps

- `resolveResource()` in `webtau/path` is not yet implemented for web mode. All other `path` functions are available. Gaps are tracked in the [issue tracker](https://github.com/devallibus/gametau/issues).

## Validating integration readiness

To validate that a gametau integration works end-to-end before shipping, use the scenario runbook in [`INTEGRATION-PROXY-VALIDATION.md`](./INTEGRATION-PROXY-VALIDATION.md). It covers eight validation scenarios (scaffold boot, command extension, persistence, diagnostics, task lifecycle, event parity, and more) using only public repository assets.

Release gate requirements and enforcement are in [`.github/release/RELEASE-GATE-CHECKLIST.md`](.github/release/RELEASE-GATE-CHECKLIST.md).
