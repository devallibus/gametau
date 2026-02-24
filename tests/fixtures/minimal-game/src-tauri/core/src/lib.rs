use serde::Serialize;

#[derive(Serialize)]
pub struct Ping {
    pub message: String,
}

pub struct GameState;

impl GameState {
    pub fn new() -> Self {
        Self
    }

    pub fn ping(&self) -> Ping {
        Ping {
            message: "pong".to_string(),
        }
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_returns_pong() {
        let state = GameState::new();
        assert_eq!(state.ping().message, "pong");
    }
}
