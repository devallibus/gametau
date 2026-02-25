use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { x: f64, y: f64 }

struct MyState { x: f64, y: f64 }

#[webtau_macros::command]
fn tick(state: &mut MyState, (dx, dy): (f64, f64)) -> View {
    state.x += dx;
    state.y += dy;
    View { x: state.x, y: state.y }
}

fn main() {}
