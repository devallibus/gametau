# Electrobun Runtime — Experimental Status

> **Status: Experimental** — Not recommended for production use.

## Overview

Electrobun is an alternative desktop runtime to Tauri for webtau-based games. It is under active evaluation as an opt-in experimental track. The stable default remains **Web (WASM) + Desktop (Tauri)**.

For the integration decision record, see `docs/ELECTROBUN-INTEGRATION-DECISION.md`.

## Stable vs Experimental Boundaries

| Surface | Status | Notes |
| --- | --- | --- |
| Core invoke/convertFileSrc | Experimental | Provider registry delegates correctly |
| Window adapter | Experimental | Full WindowAdapter interface wired |
| Event adapter | Experimental | listen/emit delegation functional |
| Filesystem adapter | Experimental | Full FsAdapter interface wired |
| Dialog adapter | Experimental | Full DialogAdapter interface wired |
| Example: counter | Partially validated | Dedicated `electrobun-counter` path validated in CI; core `counter` example still lacks Electrobun scripts |
| Example: pong | Blocked | No Electrobun run/build scripts in `examples/pong` |
| Example: battlestation | Blocked | No Electrobun run/build scripts; native-window renderer caveat remains |

## Architecture

How Electrobun integrates with webtau:

- **Provider registry** (`registerProvider`) for core invoke — routes `invoke()` calls through the registered Electrobun provider instead of Tauri IPC or WASM direct calls.
- **Module-level adapters** (`setWindowAdapter`, `setEventAdapter`, `setFsAdapter`, `setDialogAdapter`) for domain APIs — each adapter implements the same interface as the Tauri/web shim counterparts.
- **`bootstrapElectrobun()`** convenience function — registers the provider and all adapters in a single call for quick setup.

```text
┌─────────────────────────────────────────┐
│  Frontend: invoke("command", args)      │
└──────────────┬──────────────────────────┘
               │
       ┌───────▼────────┐
       │ Provider Router │
       │  (webtau core)  │
       └───┬───┬───┬────┘
           │   │   │
    Tauri  │ WASM │  Electrobun
    IPC    │ direct│  provider
           │   │   │
```

## Getting Started (Experimental)

```bash
# Electrobun is not yet available via create-gametau (see #75)
# Manual integration steps:
```

1. Install webtau: `bun add webtau`
2. Import and call `bootstrapElectrobun()` in your app entry point
3. Configure your Electrobun project according to Electrobun's own documentation

For a working example, see `examples/electrobun-counter`:

```bash
cd examples/electrobun-counter
bun install
bun run dev:electrobun
```

## Known Limitations

- No `create-gametau --runtime electrobun` option yet (#75)
- Core examples (`counter`, `pong`, `battlestation`) are not yet wired with Electrobun run/build scripts
- Battlestation native-window renderer parity remains open (see integration decision doc)
- Experimental flows may change across alpha releases
- For production workloads today, prefer the stable Tauri desktop path

## Example + Platform Matrix (#84)

Status legend: `pass` means evidence-backed execution for that target, `blocked` means the target is not executable yet.

| Example | Linux | macOS | Windows | Blocker summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| Counter (Electrobun path) | pass | pass | pass | `examples/counter` is not yet Electrobun-wired; validation currently runs through `examples/electrobun-counter` | [Dogfood run (all OS)](https://github.com/devallibus/gametau/actions/runs/22529340436), [Dogfood macOS job](https://github.com/devallibus/gametau/actions/runs/22529340436/job/65266319097), [Dogfood Windows job](https://github.com/devallibus/gametau/actions/runs/22529340436/job/65266319101), [Dogfood Linux job](https://github.com/devallibus/gametau/actions/runs/22529340436/job/65266319103), [CI Electrobun Counter Smoke (build:web + build:electrobun on Linux)](https://github.com/devallibus/gametau/actions/runs/22529278437/job/65266163923) |
| Pong | blocked | blocked | blocked | No `dev:electrobun` or `build:electrobun` scripts in [`examples/pong/package.json`](../examples/pong/package.json) | [Pong package scripts](../examples/pong/package.json), [Rust WASM codegen check includes pong commands](https://github.com/devallibus/gametau/actions/runs/22529278437/job/65266163935) |
| Battlestation | blocked | blocked | blocked | No Electrobun scripts in [`examples/battlestation/package.json`](../examples/battlestation/package.json); native-window renderer caveat still applies | [Battlestation package scripts](../examples/battlestation/package.json), [CI battlestation web smoke](https://github.com/devallibus/gametau/actions/runs/22529278437/job/65266163914), [Integration decision caveat](./ELECTROBUN-INTEGRATION-DECISION.md#2-threejs-render-boot-in-non-dom-runtime) |

### Repro Notes For Blocked Rows

From repo root:

```bash
bun run --cwd examples/counter build:electrobun
bun run --cwd examples/pong build:electrobun
bun run --cwd examples/battlestation build:electrobun
# => error: Script not found "build:electrobun"
```

### Blocking Gaps (Severity + Owner)

| Gap | Severity | Owner | Tracking |
| --- | --- | --- | --- |
| Core examples missing Electrobun scripts (`counter`, `pong`, `battlestation`) | P1 | @devallibus | #84 |
| Scaffolder runtime flag remains deferred (`create-gametau --runtime electrobun`) | P1 | @devallibus | #75 |
| Battlestation native-window renderer parity | P2 | @devallibus | [Integration decision](./ELECTROBUN-INTEGRATION-DECISION.md#2-threejs-render-boot-in-non-dom-runtime) |

## Evidence & CI

- [Dogfood workflow run (manual)](https://github.com/devallibus/gametau/actions/runs/22529340436)
- [Latest master CI run](https://github.com/devallibus/gametau/actions/runs/22529278437)
- [Contract and adapter delivery: PR #91](https://github.com/devallibus/gametau/pull/91)

## Related Issues

- #78 — Electrobun parity checklist
- #82 — Core-provider contract gaps (closed)
- #83 — Adapter implementation tranche
- #84 — Example + platform matrix validation
- #85 — Dogfood automation
- #75 — create-gametau --runtime electrobun evaluation

## Rollback to Stable Path

If experimental behavior is not suitable, switch back to stable flows:

```bash
bun run dev          # browser
bun run dev:tauri    # stable desktop
bun run build:desktop
```

No migration is required to continue using the standard Web + Tauri path.
