use std::sync::Mutex;

use battlestation_commands::{cycle_target, fire_at, fire_shot, get_mission_view, tick};
use battlestation_core::BattlestationSim;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(BattlestationSim::new()))
        .invoke_handler(tauri::generate_handler![
            get_mission_view,
            tick,
            cycle_target,
            fire_at,
            fire_shot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
