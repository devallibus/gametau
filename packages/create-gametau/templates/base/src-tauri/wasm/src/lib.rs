use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

use {{PROJECT_NAME}}_core::GameWorld;

// Generate thread-local state management for WASM
webtau::wasm_state!(GameWorld);

/// Initialize the game world. Must be called before any other function.
#[wasm_bindgen]
pub fn init(seed: u32) {
    set_state(GameWorld::new(seed as u64));
}

/// Get the current world view as a JS object.
#[wasm_bindgen]
pub fn get_world_view() -> JsValue {
    with_state(|world| to_value(&world.view()).unwrap())
}

/// Advance the simulation by one tick.
#[wasm_bindgen]
pub fn tick_world() -> JsValue {
    with_state_mut(|world| to_value(&world.tick()).unwrap())
}
