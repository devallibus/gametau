// webtau-macros: proc macros for dual Tauri/WASM command generation.
// Planned for v2 — see https://github.com/nicholasgasior/gametau
//
// Will provide:
//   #[webtau::command]
//   fn tick_world(state: &mut GameWorld) -> TickResult { ... }
//
// Which expands to both #[tauri::command] (native) and
// #[wasm_bindgen] (web) depending on target_arch.
