---
name: gametau-troubleshoot
description: Use when encountering gametau errors like NO_WASM_CONFIGURED, UNKNOWN_COMMAND, LOAD_FAILED, PROVIDER_ERROR, or PROVIDER_MISSING. Also use when debugging runtime detection, WASM loading, Tauri IPC, or provider registration issues.
---

# gametau Troubleshooting

## Error Code Reference

All gametau errors throw `WebtauError` with a structured envelope: `{ code, runtime, command, message, hint }`.

| Code | Runtime | Cause | Fix |
|---|---|---|---|
| `NO_WASM_CONFIGURED` | wasm | `invoke()` called before `configure()` in web mode | Call `configure({ loadWasm: ... })` before any invoke() |
| `UNKNOWN_COMMAND` | wasm | WASM module has no export matching the command name | Check the function is exported from the commands crate and re-exported from wasm/src/lib.rs |
| `LOAD_FAILED` | wasm | WASM module failed to load | Check loadWasm() returns a valid module; check network; check wasm-pack compiled successfully |
| `PROVIDER_ERROR` | varies | Command or provider threw during execution | Check the Rust implementation; check provider.invoke() logic |
| `PROVIDER_MISSING` | unknown | Expected provider not registered | Call registerProvider() or bootstrapTauri()/bootstrapElectrobun() |

## Diagnostic Envelope

```typescript
try {
  await invoke("my_command");
} catch (err) {
  if (err instanceof WebtauError) {
    console.error(`[${err.code}] ${err.message}`);
    console.error(`Runtime: ${err.runtime}, Command: ${err.command}`);
    console.error(`Hint: ${err.hint}`);
  }
}
```

Import: `import { WebtauError } from "webtau";`

## Common Issues by Runtime

### Web (WASM)

**"No WASM module configured"**
- Call `configure()` in your entry point before any invoke()
- Ensure the configure block runs before any component mounts

**"WASM module has no export named X"**
- The function must be `pub` and use `#[webtau::command]`
- The commands crate must be linked from wasm/src/lib.rs: `use my_commands as _;`
- Check wasm-pack built successfully: `bun run dev` logs will show errors

**"Failed to load WASM module"**
- Check `wasm-pack` is installed: `wasm-pack --version`
- Check the wasm crate compiles: `cd src-tauri/wasm && cargo check --target wasm32-unknown-unknown`
- Check the import path in loadWasm matches the wasm-pack output directory

**WASM module loads but commands return wrong types**
- Ensure return types implement `Serialize`
- Check that args use snake_case keys on the JS side

### Desktop (Tauri)

**Commands not found in Tauri**
- Ensure commands are registered in `generate_handler![]` in app/src/lib.rs
- Check command names match exactly (snake_case)

**State not available**
- Ensure `.manage(Mutex::new(YourState::new()))` is called in the Tauri builder
- The state type must match the first param type in `#[webtau::command]`

**Mutex poisoned**
- The macro generates `unwrap_or_else(|p| p.into_inner())` to recover from poisoned mutexes
- If you see panics, check if a previous command panicked while holding the lock

### Desktop (Electrobun)

**Runtime not detected**
- Check `window.__ELECTROBUN__` exists in the webview
- Call `bootstrapElectrobun()` or `bootstrapElectrobunFromWindowBridge()` in your entry point

**Capabilities not available**
- Use `getElectrobunCapabilities()` to check what's supported
- GPUWindow features require `hasGpuWindow: true` in capabilities

## Build Issues

**wasm-pack not found**
- Install: `cargo install wasm-pack`
- If prebuilt artifacts exist in wasmOutDir, webtau-vite reuses them but disables hot-reload

**Rust compilation errors with #[webtau::command]**
- "does not support async" — commands must be synchronous; use webtau/task for async work
- "does not support methods with self" — use free functions with `state: &T`
- "first parameter must be a reference" — use `state: &T` or `state: &mut T`
- "parameters must use simple identifiers" — no destructuring in param list

**Import aliasing not working**
- Ensure webtau-vite is in your vite.config.ts plugins array
- The plugin only aliases in web mode (not during `tauri dev`)
