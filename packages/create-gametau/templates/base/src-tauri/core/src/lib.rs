use rand::rngs::StdRng;
use rand::SeedableRng;
use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct WorldView {
    pub score: i32,
    pub tick_count: u32,
}

#[derive(Serialize, Clone)]
pub struct TickResult {
    pub score_delta: i32,
}

pub struct GameWorld {
    score: i32,
    tick_count: u32,
    rng: StdRng,
}

impl GameWorld {
    pub fn new(seed: u64) -> Self {
        Self {
            score: 0,
            tick_count: 0,
            rng: StdRng::seed_from_u64(seed),
        }
    }

    pub fn view(&self) -> WorldView {
        WorldView {
            score: self.score,
            tick_count: self.tick_count,
        }
    }

    pub fn tick(&mut self) -> TickResult {
        use rand::Rng;
        let delta = self.rng.gen_range(-1..=3);
        self.score += delta;
        self.tick_count += 1;
        TickResult { score_delta: delta }
    }
}
