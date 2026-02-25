use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { value: i32 }

struct MyState { value: i32 }

#[webtau_macros::command]
fn tick(state: &mut MyState, __webtau_bad: i32) -> View {
    View { value: state.value + __webtau_bad }
}

fn main() {}
