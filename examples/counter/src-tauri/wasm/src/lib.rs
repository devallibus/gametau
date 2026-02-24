use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;
use counter_core::Counter;

webtau::wasm_state!(Counter);

#[wasm_bindgen]
pub fn init() {
    set_state(Counter::new());
}

#[wasm_bindgen]
pub fn get_counter() -> JsValue {
    with_state(|c| to_value(&c.view()).unwrap())
}

#[wasm_bindgen]
pub fn increment() -> JsValue {
    with_state_mut(|c| to_value(&c.increment()).unwrap())
}

#[wasm_bindgen]
pub fn decrement() -> JsValue {
    with_state_mut(|c| to_value(&c.decrement()).unwrap())
}

#[wasm_bindgen]
pub fn reset() -> JsValue {
    with_state_mut(|c| to_value(&c.reset()).unwrap())
}
