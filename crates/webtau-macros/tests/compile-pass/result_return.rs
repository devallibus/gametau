use serde::Serialize;
use std::fmt;

#[derive(Serialize, Clone)]
struct View { value: i32 }

#[derive(Serialize, Clone, Debug)]
struct MyError(String);

impl fmt::Display for MyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

struct MyState { value: i32 }

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn fallible(state: &mut MyState) -> Result<View, MyError> {
        if state.value < 0 {
            return Err(MyError("negative value".into()));
        }
        state.value += 1;
        Ok(View { value: state.value })
    }
}

fn main() {}
