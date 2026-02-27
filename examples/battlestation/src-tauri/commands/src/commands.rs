use battlestation_core::{BattlestationSim, FireResult, MissionView};

#[cfg(target_arch = "wasm32")]
webtau::wasm_state!(BattlestationSim);

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn init() {
    set_state(BattlestationSim::new());
}

#[webtau::command]
pub fn get_mission_view(state: &BattlestationSim) -> MissionView {
    state.view()
}

#[webtau::command]
pub fn tick(state: &mut BattlestationSim, dt: f64) -> MissionView {
    state.tick(dt)
}

#[webtau::command]
pub fn cycle_target(state: &mut BattlestationSim, direction: i32) -> MissionView {
    state.cycle_target(direction)
}

#[webtau::command]
pub fn fire_at(state: &mut BattlestationSim, x: f64, y: f64) -> FireResult {
    state.fire_at(x, y)
}

#[webtau::command]
pub fn fire_shot(state: &mut BattlestationSim) -> FireResult {
    state.fire_shot()
}
