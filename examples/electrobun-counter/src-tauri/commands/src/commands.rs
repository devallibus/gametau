use counter_core::{Counter, CounterView};

#[cfg(target_arch = "wasm32")]
webtau::wasm_state!(Counter);

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn init() {
    set_state(Counter::new());
}

#[webtau::command]
pub fn get_counter(state: &Counter) -> CounterView {
    state.view()
}

#[webtau::command]
pub fn increment(state: &mut Counter) -> CounterView {
    state.increment()
}

#[webtau::command]
pub fn decrement(state: &mut Counter) -> CounterView {
    state.decrement()
}

#[webtau::command]
pub fn reset(state: &mut Counter) -> CounterView {
    state.reset()
}
