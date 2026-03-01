use std::sync::Mutex;
use counter_core::Counter;
use counter_commands::{get_counter, increment, decrement, reset};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(Counter::new()))
        .invoke_handler(tauri::generate_handler![
            get_counter,
            increment,
            decrement,
            reset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
