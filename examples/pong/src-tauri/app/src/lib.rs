use std::sync::Mutex;
use pong_core::PongGame;
use pong_commands::{get_state, tick};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(PongGame::new()))
        .invoke_handler(tauri::generate_handler![get_state, tick])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
