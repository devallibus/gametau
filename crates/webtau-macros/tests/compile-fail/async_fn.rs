use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { value: i32 }

struct MyState { value: i32 }

#[webtau_macros::command]
async fn tick(state: &MyState) -> View {
    View { value: state.value }
}

fn main() {}
