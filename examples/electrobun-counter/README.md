# Electrobun Counter (Experimental)

This example is an isolated Electrobun trial path based on `examples/counter`.

Stable defaults in gametau remain Web + Tauri. This example exists so you can
experiment without changing scaffold behavior.

## Run

Install dependencies:

```bash
bun install
```

Start the Vite web app in one terminal:

```bash
bun run dev
```

Start Electrobun in a second terminal:

```bash
bun run dev:electrobun
```

The Electrobun window loads `http://localhost:1420` during dev.

## Runtime Mode Behavior

- If a bridge is exposed at `window.__ELECTROBUN__`, this example registers an
  Electrobun provider and routes `invoke()` through it.
- If no Electrobun bridge is present, it falls back to the normal WASM web path.

Expected bridge shape:

```ts
window.__ELECTROBUN__ = {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>,
  convertFileSrc?: (filePath: string, protocol?: string) => string,
};
```

## Build

```bash
bun run build:web
bun run build:electrobun
```
