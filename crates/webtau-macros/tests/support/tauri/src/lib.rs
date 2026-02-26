use std::ops::Deref;

pub use tauri_macros::command;

/// Minimal test-only stand-in for `tauri::State`.
pub struct State<'a, T>(&'a T);

impl<'a, T> State<'a, T> {
    pub fn new(inner: &'a T) -> Self {
        Self(inner)
    }
}

impl<'a, T> Deref for State<'a, T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        self.0
    }
}
