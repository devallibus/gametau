mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{cycle_target, dispatch_support, get_mission_view, tick};

#[cfg(target_arch = "wasm32")]
pub use commands::{cycle_target, dispatch_support, get_mission_view, init, tick};
