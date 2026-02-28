# Electrobun x gametau Showcase

Welcome! This page is the easiest way to try gametau running in Electrobun.

If you just want one link to share, use this branch:

- `electrobun/showcase`

## What this is

gametau lets one Rust game codebase run in both:

- browser (WASM)
- desktop app shells

In this branch, we wired Electrobun for a simple hands-on demo path.

## Try it in 2 minutes

From repo root:

```bash
bun install
bun run --cwd packages/webtau build
bun run --cwd packages/webtau-vite build
```

Now launch the Counter demo in Electrobun:

```bash
bun run --cwd examples/counter dev:electrobun
```

What you should see:

- A native Electrobun window opens (the command starts both Vite + Electrobun).
- Counter buttons work (increment/decrement/reset).
- Closing the app also stops the local dev server.

## More demos

Run either of these the same way:

```bash
bun run --cwd examples/pong dev:electrobun
bun run --cwd examples/battlestation dev:electrobun
```

## Build desktop packages

```bash
bun run --cwd examples/counter build:electrobun
bun run --cwd examples/pong build:electrobun
bun run --cwd examples/battlestation build:electrobun
```

## Useful links

- Showcase PR: [#94](https://github.com/devallibus/gametau/pull/94)
- Main Electrobun tracking issue: [#84](https://github.com/devallibus/gametau/issues/84)
- Local dev bug report and fix thread: [#95](https://github.com/devallibus/gametau/issues/95)
