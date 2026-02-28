# A130 Defense Showcase Walkthrough

`examples/battlestation` is the flagship `v0.3.0` showcase. It demonstrates a
space-defense gameplay loop while intentionally exercising the full `webtau`
runtime/module story.

Live web demo: <https://gametau.devallibus.com/battlestation/>

Design intent source: `docs/BATTLESTATION-DESIGN-BRIEF.md`.

## Module Coverage Map

| Module | Where Used | Purpose in Showcase |
|---|---|---|
| `webtau` (`invoke`, `configure`, `isTauri`) | `examples/battlestation/src/index.ts`, `src/services/backend.ts` | Unified Rust command calls across web (WASM) and desktop (Tauri IPC) |
| `webtau/input` | `examples/battlestation/src/index.ts` | Keyboard + touch + gamepad target selection and fire intents |
| `webtau/audio` | `examples/battlestation/src/index.ts` | Tactical tones for hit, kill confirm, miss, integrity loss, and critical alerts |
| `webtau/assets` | `examples/battlestation/src/index.ts` | Runtime loading of mission and theme JSON assets |
| `webtau/path` + `webtau/fs` | `examples/battlestation/src/services/profile.ts` | Persistent operator profile and mission outcome storage |
| `webtau/event` | `examples/battlestation/src/services/comms.ts` + `src/index.ts` | Alert/comms event pipeline and in-UI event log |
| `webtau/app` | `examples/battlestation/src/index.ts` | Runtime app metadata display (`name/version/runtime`) |

## Gameplay Loop

1. Enemies approach from arena edges toward the center defense cluster.
2. Select target via keyboard/touch/gamepad axis.
3. Fire kinetic shot at selected target, or click/tap for positional orbital strike.
4. Read comms + audio feedback (hit/kill/miss differentiation).
5. Preserve defense integrity as waves escalate in speed and enemy composition.

## Command Contract

The TypeScript backend service (`src/services/backend.ts`) wraps these Rust commands:

| Command | Rust Method | Purpose |
|---|---|---|
| `get_mission_view` | `BattlestationSim::view()` | Read current state |
| `tick` | `BattlestationSim::tick(dt)` | Advance simulation |
| `cycle_target` | `BattlestationSim::cycle_target(direction)` | Change selected target |
| `fire_shot` | `BattlestationSim::fire_shot()` | Fire at selected target |
| `fire_at` | `BattlestationSim::fire_at(x, y)` | Positional orbital strike |

Both web (WASM) and desktop (Tauri IPC) paths use identical command names and argument shapes.

## Local Run

```bash
cd examples/battlestation
bun install
bun run dev          # web
bun run dev:tauri    # desktop
```

## Why This Is Flagship

- Uses the complete runtime narrative instead of a single API seam.
- Keeps architecture explicit (`services/backend`, `services/profile`, `services/comms`).
- Links product behavior to design intent and roadmap sequencing.
