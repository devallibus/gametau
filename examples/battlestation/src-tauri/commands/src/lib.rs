mod commands;

#[cfg(not(target_arch = "wasm32"))]
pub use commands::{cycle_target, fire_at, fire_shot, get_mission_view, tick};

#[cfg(target_arch = "wasm32")]
pub use commands::{cycle_target, fire_at, fire_shot, get_mission_view, init, tick};
