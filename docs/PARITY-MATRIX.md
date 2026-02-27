# webtau Parity Matrix

This document tracks how `webtau` web shims compare to the `@tauri-apps/api/*` namespaces that `webtau-vite` aliases in web builds.

Scope:
- Aliased shim modules: `core`, `window`, `dpi`, `fs`, `dialog`, `event`, `app`, `path`
- Foundation modules (no Tauri equivalent): `input`, `audio`, `assets`

## Legend

- `Implemented`: same API name is available and usable in web mode.
- `No-op`: API exists for compatibility but intentionally does nothing on web.
- `Partial`: API name exists, but semantics differ from native Tauri behavior.
- `Not implemented`: available in Tauri but not provided by current `webtau` shim.

## Coverage Summary (v0.4.0)

Coverage is an approximate function-level view of each aliased namespace.

| Module | Coverage | Notes |
|---|---:|---|
| `webtau/core` | ~25% | `invoke()` + `convertFileSrc()` parity; `configure()`/`isTauri()` are webtau-specific helpers |
| `webtau/window` | ~40% | Common gameplay/window controls implemented; many advanced window APIs are not implemented |
| `webtau/dpi` | 100% | Core logical/physical size and position classes are implemented |
| `webtau/fs` | ~60% | Core read/write/dir/copy/rename primitives implemented via IndexedDB-backed virtual FS |
| `webtau/dialog` | 100% (name-level), partial semantics | All common dialog functions exist; browser behavior differs from desktop |
| `webtau/event` | 100% (name-level), partial semantics | Event API exists; web behavior is browser/local-event scoped |
| `webtau/app` | ~46% | 6/13 Tauri app APIs implemented (`getName/getVersion/getTauriVersion/getIdentifier/show/hide`) |
| `webtau/path` | ~82% | 28/34 Tauri path APIs implemented; missing advanced/system resolvers |

---

## `webtau/core` vs `@tauri-apps/api/core`

| Export | Status | Web behavior | Tauri equivalent |
|---|---|---|---|
| `invoke(command, args?)` | Implemented (partial) | Calls WASM export in web mode; delegates to Tauri IPC in Tauri mode | `invoke` |
| `convertFileSrc(filePath, protocol?)` | Implemented | Returns path as-is on web (no protocol conversion needed) | `convertFileSrc` |
| `configure({ loadWasm, onLoadError? })` | webtau-specific | Registers lazy WASM loader for web mode | N/A |
| `isTauri()` | webtau-specific | Checks `window.__TAURI_INTERNALS__` | N/A |

Common Tauri core APIs not implemented by this shim: `Channel`, callback/plugin helpers.

## `webtau/window` vs `@tauri-apps/api/window`

Top-level shim export:

| Export | Status | Web behavior |
|---|---|---|
| `getCurrentWindow()` | Implemented | Returns singleton `WebWindow` shim |

`WebWindow` methods:

| Method | Status | Web behavior |
|---|---|---|
| `isFullscreen()` | Implemented | Uses `document.fullscreenElement` |
| `setFullscreen(bool)` | Implemented | Uses Fullscreen API |
| `innerSize()` / `outerSize()` | Implemented | Uses `window.innerWidth/innerHeight` and `window.outerWidth/outerHeight` |
| `setSize(LogicalSize/PhysicalSize)` | Partial | Uses `window.resizeTo`, browser restrictions apply |
| `maximize()` | Partial | Approximated via fullscreen |
| `isMaximized()` | Partial | Mirrors fullscreen state |
| `title()` / `setTitle()` | Implemented | Reads/writes `document.title` |
| `close()` | Partial | Calls `window.close()`, browser may ignore |
| `minimize()` / `unminimize()` | No-op | Not available in browser tabs |
| `show()` / `hide()` | No-op | Not available in browser tabs |
| `setDecorations(bool)` | No-op | Browser chrome not controllable from JS |
| `center()` | Partial | Uses `window.moveTo`, browser restrictions apply |
| `currentMonitor()` | Partial | Uses `screen.*` approximation |
| `scaleFactor()` | Implemented | Uses `window.devicePixelRatio` |

Common Tauri window APIs not implemented include advanced positioning, resizability flags, z-order/taskbar/dock integration, per-window event APIs, and platform-only controls.

## `webtau/dpi` vs `@tauri-apps/api/dpi`

| Export | Status | Web behavior |
|---|---|---|
| `LogicalSize` | Implemented | Includes `toPhysical(scaleFactor)` |
| `PhysicalSize` | Implemented | Includes `toLogical(scaleFactor)` |
| `LogicalPosition` | Implemented | Includes `toPhysical(scaleFactor)` |
| `PhysicalPosition` | Implemented | Includes `toLogical(scaleFactor)` |

## `webtau/fs` vs `@tauri-apps/api/fs`

Backed by IndexedDB with in-memory fallback in non-browser test environments.

| Export | Status | Web behavior |
|---|---|---|
| `writeTextFile` | Implemented | Stores text in virtual FS |
| `readTextFile` | Implemented | Reads text from virtual FS |
| `writeFile` | Implemented | Stores bytes in virtual FS |
| `readFile` | Implemented | Reads bytes from virtual FS |
| `exists` | Implemented | Checks virtual FS entries |
| `mkdir` / `createDir` | Implemented | Creates virtual directory chain |
| `readDir` | Implemented | Returns virtual directory entries |
| `remove` / `removeDir` | Implemented | Removes virtual entries (supports recursive) |
| `copyFile` | Implemented | Copies file content within virtual FS |
| `rename` | Implemented | Moves file via copy-then-remove in virtual FS (file-only; directories not supported) |

Common Tauri fs APIs not implemented include link/chmod/chown, direct path resolution against OS locations, and native permission model behavior.

## `webtau/dialog` vs `@tauri-apps/api/dialog`

| Export | Status | Web behavior |
|---|---|---|
| `message` | Implemented (partial) | Uses HTML `<dialog>` or `alert` fallback |
| `ask` / `confirm` | Implemented (partial) | Uses HTML `<dialog>` or `confirm` fallback |
| `open` | Implemented (partial) | Uses hidden `<input type="file">`; returns selected names/relative paths |
| `save` | Implemented (partial) | Uses `<dialog>` text input or `prompt` fallback |

Note: Desktop-native file-picker behavior and absolute filesystem paths are not available in standard browser context.

## `webtau/event` vs `@tauri-apps/api/event`

| Export | Status | Web behavior |
|---|---|---|
| `listen(event, cb)` | Implemented (partial) | Uses `window.addEventListener` or in-memory fallback |
| `once(event, cb)` | Implemented (partial) | Auto-unlistens after first callback |
| `emit(event, payload)` | Implemented (partial) | Uses `window.dispatchEvent(new CustomEvent(...))` |
| `emitTo(target, event, payload)` | Partial | Alias of `emit` in web mode (no real target routing) |

## `webtau/app` vs `@tauri-apps/api/app`

| Export | Status | Web behavior | Tauri equivalent |
|---|---|---|---|
| `getName()` | Implemented (partial) | Configured name, else `document.title`, else `"gametau-app"` | `getName` |
| `getVersion()` | Implemented (partial) | Configured version, else `"0.0.0"` | `getVersion` |
| `getTauriVersion()` | Implemented (partial) | Returns `"web"` | `getTauriVersion` |
| `getIdentifier()` | Implemented (partial) | Configured identifier, else `document.location.hostname`, else `"dev.gametau.app"` | `getIdentifier` |
| `show()` | No-op | Browser tabs cannot be shown programmatically | `show` |
| `hide()` | No-op | Browser tabs cannot be hidden programmatically | `hide` |
| `setAppName(name \| null)` | webtau-specific | Sets/clears fallback app name | N/A |
| `setAppVersion(version \| null)` | webtau-specific | Sets/clears fallback app version | N/A |
| `setAppIdentifier(id \| null)` | webtau-specific | Sets/clears fallback app identifier | N/A |

Current Tauri app APIs not implemented include `defaultWindowIcon`, `setTheme`, data-store APIs, bundle-type APIs, dock visibility APIs, and Android back-button listener hooks.

## `webtau/path` vs `@tauri-apps/api/path`

Implemented exports:

| Export | Status | Web behavior |
|---|---|---|
| `sep()` | Implemented | Always `/` |
| `delimiter()` | Implemented | Always `:` (POSIX PATH-list separator) |
| `appDataDir` / `appLocalDataDir` / `appConfigDir` / `appCacheDir` / `appLogDir` | Partial | Virtual `/app/*` locations |
| `desktopDir` / `documentDir` / `downloadDir` / `homeDir` / `audioDir` / `pictureDir` / `publicDir` / `videoDir` | Partial | Virtual `/app/*` locations |
| `resourceDir` / `tempDir` | Partial | Virtual `/app/resources` and `/app/temp` |
| `cacheDir` / `configDir` / `dataDir` / `localDataDir` | Partial | Virtual `/app/*` locations (system-level resolvers) |
| `basename` / `dirname` / `extname` / `join` / `normalize` / `resolve` / `isAbsolute` | Implemented (POSIX-style) | Browser-safe path utilities |

Tauri path APIs currently not implemented:
- `executableDir()`
- `fontDir()`
- `runtimeDir()`
- `templateDir()`
- `resolveResource(resourcePath)`

---

## Foundation Modules (No Tauri Equivalent)

These modules are native `webtau` features and are not parity shims.

| Module | Factory | Status | Purpose |
|---|---|---|---|
| `webtau/input` | `createInputController(options?)` | Implemented | Unified keyboard/gamepad/touch/pointer-lock input layer |
| `webtau/audio` | `createAudioController(options?)` | Implemented | Minimal Web Audio controller with tone playback and master controls |
| `webtau/assets` | `createAssetLoader(options?)` | Implemented | Cached text/json/bytes/image asset loading helpers |

### `webtau/input` API

| Method | Status | Behavior |
|---|---|---|
| `destroy()` | Implemented | Removes listeners and clears controller state |
| `isPressed(key)` | Implemented | Returns keyboard pressed state |
| `keyAxis(negative, positive)` | Implemented | Resolves digital axis from key bindings |
| `gamepadAxis(axisIndex, options?)` | Implemented | Reads gamepad axis with deadzone/invert support |
| `touches()` | Implemented | Returns active touch points |
| `requestPointerLock(element)` | Implemented (partial) | Best-effort pointer-lock request in supported browsers |
| `isPointerLocked(element?)` | Implemented | Reports pointer-lock state |
| `consumePointerDelta()` | Implemented | Returns and resets accumulated pointer delta |

### `webtau/audio` API

| Method | Status | Behavior |
|---|---|---|
| `isSupported()` | Implemented | Indicates Web Audio availability |
| `isMuted()` | Implemented | Returns mute state |
| `setMuted(bool)` | Implemented | Toggles mute for controller output |
| `getMasterVolume()` | Implemented | Returns current master volume (`0..1`) |
| `setMasterVolume(value)` | Implemented | Sets/clamps master volume (`0..1`) |
| `resume()` | Implemented | Resumes audio context when available |
| `suspend()` | Implemented | Suspends audio context when available |
| `playTone(freq, durationMs, options?)` | Implemented | Plays synthesized tone (no-op when muted/unsupported) |

### `webtau/assets` API

| Method | Status | Behavior |
|---|---|---|
| `clear()` | Implemented | Clears in-memory asset cache |
| `loadText(url, init?)` | Implemented | Loads and caches text response |
| `loadJson<T>(url, init?)` | Implemented | Loads text and parses JSON with cache |
| `loadBytes(url, init?)` | Implemented | Loads and caches binary payload |
| `loadImage(url)` | Implemented | Loads and caches image element |

## References

- Tauri v2 JavaScript API: <https://v2.tauri.app/reference/javascript/api/>
- Path namespace reference: <https://v2.tauri.app/reference/javascript/api/namespacepath/>
- App namespace reference: <https://v2.tauri.app/reference/javascript/api/namespaceapp/>
