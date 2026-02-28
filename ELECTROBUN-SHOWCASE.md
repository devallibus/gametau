# Electrobun Showcase Branch

Branch: `electrobun/showcase`

This branch is a single handoff surface for Electrobun-focused review.

## What is included

- Runtime-provider and adapter tranche already merged into `master`.
- Electrobun smoke lane and dogfood workflow already merged.
- Electrobun example scripts added for:
  - `examples/counter`
  - `examples/pong`
  - `examples/battlestation`
  - (existing) `examples/electrobun-counter`

## Quick run commands

From repo root:

```bash
bun install
bun run --cwd packages/webtau build
bun run --cwd packages/webtau-vite build

bun run --cwd examples/counter dev:electrobun
bun run --cwd examples/pong dev:electrobun
bun run --cwd examples/battlestation dev:electrobun
```

Build checks:

```bash
bun run --cwd examples/counter build:electrobun
bun run --cwd examples/pong build:electrobun
bun run --cwd examples/battlestation build:electrobun
```

## Tracking references

- Readiness epic: [Issue #78](https://github.com/devallibus/gametau/issues/78)
- Adapter tranche: [PR #91](https://github.com/devallibus/gametau/pull/91)
- Platform matrix: [PR #92](https://github.com/devallibus/gametau/pull/92)
- Latest CI (master): [CI workflow](https://github.com/devallibus/gametau/actions/workflows/ci.yml)
