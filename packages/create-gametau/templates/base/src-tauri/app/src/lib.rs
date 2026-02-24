use std::sync::Mutex;

use tauri::State;

// Import your core game logic
use {{PROJECT_NAME}}_core::GameWorld;

struct AppState(Mutex<GameWorld>);

#[tauri::command]
fn get_world_view(
    state: State<AppState>,
) -> {{PROJECT_NAME}}_core::WorldView {
    let world = state.0.lock().unwrap();
    world.view()
}

#[tauri::command]
fn tick_world(
    state: State<AppState>,
) -> {{PROJECT_NAME}}_core::TickResult {
    let mut world = state.0.lock().unwrap();
    world.tick()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(GameWorld::new(42))))
        .invoke_handler(tauri::generate_handler![get_world_view, tick_world])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
