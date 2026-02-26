use pong_core::{GameView, PongGame};

#[cfg(target_arch = "wasm32")]
webtau::wasm_state!(PongGame);

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn init() {
    set_state(PongGame::new());
}

#[webtau::command]
pub fn get_state(state: &PongGame) -> GameView {
    state.view()
}

#[webtau::command]
pub fn tick(state: &mut PongGame, dt: f64, left_input: i32, right_input: i32) -> GameView {
    state.tick(dt, left_input, right_input)
}
