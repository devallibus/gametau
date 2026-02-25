use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::{from_value, to_value};
use pong_core::{PongGame, TickArgs};

webtau::wasm_state!(PongGame);

#[wasm_bindgen]
pub fn init() {
    set_state(PongGame::new());
}

#[wasm_bindgen]
pub fn get_state() -> JsValue {
    with_state(|g| to_value(&g.view()).unwrap())
}

#[wasm_bindgen]
pub fn tick(args: JsValue) -> JsValue {
    let args: TickArgs = from_value(args).unwrap();
    with_state_mut(|g| to_value(&g.tick(args.dt, args.left_input, args.right_input)).unwrap())
}
