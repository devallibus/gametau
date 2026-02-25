use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { x: f64, y: f64 }

struct Game { x: f64, y: f64 }

impl Game {
    fn tick(&mut self, dt: f64, input: i32) -> View {
        self.x += dt * input as f64;
        View { x: self.x, y: self.y }
    }
}

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn tick(state: &mut Game, dt: f64, input: i32) -> View {
        state.tick(dt, input)
    }
}

fn main() {}
