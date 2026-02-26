use serde::Serialize;

#[derive(Serialize, Clone)]
struct View { value: i32 }

struct MyState { value: i32 }

impl MyState {
    fn view(&self) -> View { View { value: self.value } }
}

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn get_view(state: &MyState) -> View {
        state.view()
    }
}

fn main() {}
