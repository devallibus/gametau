use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { x: f64, y: f64 }

struct Game { x: f64, y: f64 }

impl Game {
    fn tick(&mut self, dt: f64) -> View {
        self.x += dt;
        View { x: self.x, y: self.y }
    }
}

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn tick(state: &mut Game, mut dt: f64) -> View {
        dt += 1.0;
        state.tick(dt)
    }
}

fn main() {}
