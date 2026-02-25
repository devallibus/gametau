use std::sync::Mutex;
use tauri::State;
use pong_core::PongGame;

struct AppState(Mutex<PongGame>);

#[tauri::command]
fn get_state(state: State<AppState>) -> pong_core::GameView {
    state.0.lock().unwrap().view()
}

#[tauri::command]
fn tick(dt: f64, left_input: i32, right_input: i32, state: State<AppState>) -> pong_core::GameView {
    state.0.lock().unwrap().tick(dt, left_input, right_input)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(PongGame::new())))
        .invoke_handler(tauri::generate_handler![get_state, tick])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
