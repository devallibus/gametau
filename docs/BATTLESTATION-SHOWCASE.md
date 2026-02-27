# Battlestation Showcase Walkthrough

`examples/battlestation` is the flagship `v0.3.0` showcase. It demonstrates a
radar-command gameplay loop while intentionally exercising the full `webtau`
runtime/module story.

Live web demo: <https://devallibus.github.io/gametau/battlestation/>

Design intent source: `docs/BATTLESTATION-DESIGN-BRIEF.md`.

## Module Coverage Map

| Module | Where Used | Purpose in Showcase |
|---|---|---|
| `webtau` (`invoke`, `configure`, `isTauri`) | `examples/battlestation/src/index.ts`, `src/services/backend.ts` | Unified Rust command calls across web (WASM) and desktop (Tauri IPC) |
| `webtau/input` | `examples/battlestation/src/index.ts` | Keyboard + touch + gamepad target selection and dispatch intents |
| `webtau/audio` | `examples/battlestation/src/index.ts` | Tactical tones for dispatch, integrity loss, and critical alerts |
| `webtau/assets` | `examples/battlestation/src/index.ts` | Runtime loading of mission and theme JSON assets |
| `webtau/path` + `webtau/fs` | `examples/battlestation/src/services/profile.ts` | Persistent operator profile and mission outcome storage |
| `webtau/event` | `examples/battlestation/src/services/comms.ts` + `src/index.ts` | Alert/comms event pipeline and in-UI event log |
| `webtau/app` | `examples/battlestation/src/index.ts` | Runtime app metadata display (`name/version/runtime`) |

## Gameplay Loop

1. Scan moving contacts on radar.
2. Select target via keyboard/touch/gamepad axis.
3. Dispatch support action.
4. Read comms + audio feedback.
5. Preserve mission integrity as pressure escalates.

## Phase 1 Carryover Gaps (Resolved in Phase 2)

Phase 1 intentionally deferred:

- persistent profile/settings
- richer comms orchestration
- full module-coverage storytelling

Phase 2 resolves those gaps in this final showcase implementation.

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
