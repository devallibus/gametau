use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { x: f64, y: f64 }

struct Game { x: f64, y: f64 }

impl Game {
    fn view(&self) -> View { View { x: self.x, y: self.y } }
    fn advance(&mut self, dt: f64) -> View {
        self.x += dt;
        self.view()
    }
}

mod commands {
    use super::*;

    // First param named 'world' instead of 'state' — should work fine
    #[webtau_macros::command]
    fn get_view(world: &Game) -> View {
        world.view()
    }

    // First param named 'game' with extra args
    #[webtau_macros::command]
    fn advance(game: &mut Game, dt: f64) -> View {
        game.advance(dt)
    }
}

fn main() {}
