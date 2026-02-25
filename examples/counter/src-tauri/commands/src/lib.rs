mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{get_counter, increment, decrement, reset};

#[cfg(target_arch = "wasm32")]
pub use commands::{init, get_counter, increment, decrement, reset};
