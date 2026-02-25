use {{PROJECT_NAME}}_core::{GameWorld, WorldView, TickResult};

#[cfg(target_arch = "wasm32")]
webtau::wasm_state!(GameWorld);

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn init(seed: u32) {
    set_state(GameWorld::new(seed as u64));
}

#[webtau::command]
pub fn get_world_view(state: &GameWorld) -> WorldView {
    state.view()
}

#[webtau::command]
pub fn tick_world(state: &mut GameWorld) -> TickResult {
    state.tick()
}
