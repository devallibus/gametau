# Getting Started: Scaffold to Playable

This guide walks you from a fresh scaffold to a playable game loop in both browser and Tauri desktop mode.

## 1) Prerequisites

- Rust (with `wasm32-unknown-unknown`)
- `wasm-pack`
- Bun (or Node 18+)
- Tauri CLI (for desktop run path)

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

## 6) Run in Tauri Desktop Mode

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
- Live API docs: `https://devallibus.github.io/gametau/api/`

## 9) Next Steps

- Read architecture details in `README.md`
- Review release gating + incident procedures in `docs/RELEASE-GATE-CHECKLIST.md` and `docs/RELEASE-INCIDENT-RESPONSE.md`
- Explore examples in `examples/counter` and `examples/pong`
