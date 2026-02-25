mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{get_world_view, tick_world};

#[cfg(target_arch = "wasm32")]
pub use commands::{init, get_world_view, tick_world};
