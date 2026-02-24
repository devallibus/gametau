use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;
use minimal_core::GameState;

webtau::wasm_state!(GameState);

#[wasm_bindgen]
pub fn init() {
    set_state(GameState::new());
}

#[wasm_bindgen]
pub fn ping() -> JsValue {
    with_state(|s| to_value(&s.ping()).unwrap())
}
