# Getting Started: Scaffold to Playable

This guide walks you from a fresh scaffold to a playable game loop in the stable browser + Tauri desktop path.

Electrobun support is experimental and intentionally documented separately in `docs/ELECTROBUN-EXPERIMENTAL.md`.

## 1) Prerequisites

- Rust (with `wasm32-unknown-unknown`)
- `wasm-pack` (required for fresh Rust/WASM builds and Rust watch rebuilds)
- Bun (or Node 18+)
- Tauri CLI (stable desktop run path)
- Electrobun tooling (experimental path only; see `docs/ELECTROBUN-EXPERIMENTAL.md`)

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
bun add -g @tauri-apps/cli
```

## 2) Scaffold a Project

Choose one template:

```bash
bunx create-gametau my-game
# or: bunx create-gametau my-game -t pixi
# or: bunx create-gametau my-game -t vanilla
```

Install dependencies:

```bash
cd my-game
bun install
```

This scaffold defaults to the stable Tauri desktop path. Experimental Electrobun trials use a separate opt-in flow.

## 3) Run in Browser (Web/WASM)

```bash
bun run dev
```

Open the local URL printed by Vite (default `http://localhost:1420`).

You should see:

- a rendered scene (template-dependent)
- HUD values (`Score` and `Tick`) updating over time

This confirms your Rust core + commands + WASM bridge are wired correctly.

## 4) Make Your First Frontend Change

Open `src/game/scene.ts` and change one obvious value (for example background or mesh color), then save.

The page should hot-reload and show the visual change immediately.

## 5) Make Your First Rust Gameplay Change

Open `src-tauri/core/src/lib.rs` and tweak the tick delta range:

```rust
let delta = self.rng.gen_range(-1..=3);
```

to:

```rust
let delta = self.rng.gen_range(1..=5);
```

Save and refresh the browser. `Score` should now climb faster, proving the Rust gameplay path is active in web mode.

Note: if `wasm-pack` is unavailable but you already have valid prebuilt `src/wasm` artifacts, web builds can still run in fallback mode. In that mode, Rust watch rebuilds are disabled until `wasm-pack` is installed.

## 6) Run in Tauri Desktop Mode (Stable)

```bash
bun run dev:tauri
```

A desktop window should open and run the same game behavior with the same frontend command calls.

## 7) Build Outputs

Web build:

```bash
bun run build:web
```

Desktop build:

```bash
bun run build:desktop
```

## 8) Understand What's Available

Before expanding your game, check current runtime parity and API surface:

- Function-level parity matrix: `docs/PARITY-MATRIX.md`
- Live API docs: `https://gametau.devallibus.com/api/`

### Linting

Run `bun run lint` from the repository root to check all packages. CI enforces lint as a merge gate.

## 9) Next Steps

- Read architecture details in `README.md`
- Try the experimental Electrobun flow (opt-in): `docs/ELECTROBUN-EXPERIMENTAL.md`
- Review release gating + incident procedures in `docs/RELEASE-GATE-CHECKLIST.md` and `docs/RELEASE-INCIDENT-RESPONSE.md`
- Explore examples in `examples/counter`, `examples/pong`, and `examples/battlestation`
