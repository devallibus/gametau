# Electrobun Runtime — Experimental Status

> **Status: Experimental** — Not recommended for production use.

## Overview

Electrobun is an alternative desktop runtime to Tauri for webtau-based games. It is under active evaluation as an opt-in experimental track. The stable default remains **Web (WASM) + Desktop (Tauri)**.

For the integration decision record, see `docs/ELECTROBUN-INTEGRATION-DECISION.md`.

## Stable vs Experimental Boundaries

| Surface | Status | Notes |
|---------|--------|-------|
| Core invoke/convertFileSrc | Experimental | Provider registry delegates correctly |
| Window adapter | Experimental | Full WindowAdapter interface wired |
| Event adapter | Experimental | listen/emit delegation functional |
| Filesystem adapter | Experimental | Full FsAdapter interface wired |
| Dialog adapter | Experimental | Full DialogAdapter interface wired |
| Example: counter | Not yet validated | Pending platform matrix (#84) |
| Example: pong | Not yet validated | Pending platform matrix (#84) |
| Example: battlestation | Not yet validated | Pending platform matrix (#84) |

## Architecture

How Electrobun integrates with webtau:

- **Provider registry** (`registerProvider`) for core invoke — routes `invoke()` calls through the registered Electrobun provider instead of Tauri IPC or WASM direct calls.
- **Module-level adapters** (`setWindowAdapter`, `setEventAdapter`, `setFsAdapter`, `setDialogAdapter`) for domain APIs — each adapter implements the same interface as the Tauri/web shim counterparts.
- **`bootstrapElectrobun()`** convenience function — registers the provider and all adapters in a single call for quick setup.

```
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
- Platform matrix not yet validated (#84)
- Dogfood automation pending (#85)
- Experimental flows may change across alpha releases
- For production workloads today, prefer the stable Tauri desktop path

## Evidence & CI

<!-- Placeholders — to be filled as evidence becomes available -->
- [ ] Dogfood workflow: (link pending, see #85)
- [ ] Platform matrix: (link pending, see #84)
- [ ] Contract test results: PR #87

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
