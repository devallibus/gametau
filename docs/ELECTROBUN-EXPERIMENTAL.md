# Electrobun Experimental Trial Path

Status: **Experimental (opt-in)**  
Stable default remains: **Web (WASM) + Desktop (Tauri)**.

This guide is for trying Electrobun without changing gametau's stable defaults.

## Scope And Support Boundary

- Electrobun support is under active evaluation.
- The default `create-gametau` scaffolds and stable docs remain Tauri-first for desktop.
- Experimental flows may change across alpha releases.
- For production workloads today, prefer the stable Tauri desktop path.

See also:
- `docs/ELECTROBUN-INTEGRATION-DECISION.md`
- `docs/GETTING-STARTED.md`

## Prerequisites

- Rust with `wasm32-unknown-unknown`
- `wasm-pack`
- Bun
- Electrobun tooling/runtime for local desktop execution

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Quick Trial (Repository Example)

Use the isolated example so your existing projects remain untouched:

```bash
cd examples/electrobun-counter
bun install
bun run dev
```

Run the Electrobun desktop path:

```bash
bun run dev:electrobun
```

Build artifacts:

```bash
bun run build:web
bun run build:electrobun
```

## How The Runtime Wiring Works

- Browser mode keeps the normal `configure(...)` WASM path.
- Electrobun mode registers a runtime provider via `registerProvider(...)`.
- Frontend command calls still use `invoke("...")` so app code stays portable.

## Known Limitations (Current Phase)

- This is not the default scaffold/runtime selection path yet.
- CLI runtime selection (`create-gametau --runtime electrobun`) is intentionally deferred.
- Compatibility and API parity are still being validated.

## Rollback To Stable Path

If experimental behavior is not suitable, switch back to stable flows:

```bash
bun run dev          # browser
bun run dev:tauri    # stable desktop
bun run build:desktop
```

No migration is required to continue using the standard Web + Tauri path.

## Distribution Notes

Electrobun-related rollout work is distributed on the alpha line (`0.5.0-alpha.x`) so `latest` stable consumers are unaffected.

Install prerelease packages explicitly:

```bash
npm install webtau@alpha webtau-vite@alpha create-gametau@alpha
```
