use std::sync::Mutex;
use tauri::State;
use counter_core::Counter;

struct AppState(Mutex<Counter>);

#[tauri::command]
fn get_counter(state: State<AppState>) -> counter_core::CounterView {
    let counter = state.0.lock().unwrap();
    counter.view()
}

#[tauri::command]
fn increment(state: State<AppState>) -> counter_core::CounterView {
    let mut counter = state.0.lock().unwrap();
    counter.increment()
}

#[tauri::command]
fn decrement(state: State<AppState>) -> counter_core::CounterView {
    let mut counter = state.0.lock().unwrap();
    counter.decrement()
}

#[tauri::command]
fn reset(state: State<AppState>) -> counter_core::CounterView {
    let mut counter = state.0.lock().unwrap();
    counter.reset()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState(Mutex::new(Counter::new())))
        .invoke_handler(tauri::generate_handler![
            get_counter,
            increment,
            decrement,
            reset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
