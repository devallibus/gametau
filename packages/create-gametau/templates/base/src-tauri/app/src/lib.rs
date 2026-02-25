use std::sync::Mutex;

use {{PROJECT_NAME}}_core::GameWorld;
use {{PROJECT_NAME}}_commands::{get_world_view, tick_world};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(GameWorld::new(42)))
        .invoke_handler(tauri::generate_handler![get_world_view, tick_world])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
