mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{get_state, tick};

#[cfg(target_arch = "wasm32")]
pub use commands::{init, get_state, tick};
