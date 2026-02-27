use serde::Serialize;

trait Viewable {}

#[derive(Serialize, Clone)]
struct View { value: i32 }
impl Viewable for View {}

struct MyState { value: i32 }

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn returns_trait(state: &MyState) -> impl Viewable {
        View { value: state.value }
    }
}

fn main() {}
