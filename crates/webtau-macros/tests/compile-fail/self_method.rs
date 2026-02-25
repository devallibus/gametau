use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { value: i32 }

struct MyState { value: i32 }

impl MyState {
    #[webtau_macros::command]
    fn tick(&self) -> View {
        View { value: self.value }
    }
}

fn main() {}
