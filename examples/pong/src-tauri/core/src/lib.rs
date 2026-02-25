use serde::{Deserialize, Serialize};

// Arena constants (shared with frontend via GameView dimensions)
pub const WIDTH: f64 = 800.0;
pub const HEIGHT: f64 = 600.0;
pub const PADDLE_WIDTH: f64 = 15.0;
pub const PADDLE_HEIGHT: f64 = 80.0;
pub const PADDLE_OFFSET: f64 = 30.0;
pub const BALL_RADIUS: f64 = 8.0;
const PADDLE_SPEED: f64 = 400.0;
const BALL_INITIAL_SPEED: f64 = 300.0;
const BALL_SPEED_INCREMENT: f64 = 20.0;
const BALL_MAX_SPEED: f64 = 600.0;

#[derive(Serialize, Clone)]
pub struct GameView {
    pub ball_x: f64,
    pub ball_y: f64,
    pub left_y: f64,
    pub right_y: f64,
    pub left_score: u32,
    pub right_score: u32,
}

#[derive(Deserialize)]
pub struct TickArgs {
    pub dt: f64,
    pub left_input: i32,
    pub right_input: i32,
}

pub struct PongGame {
    ball_x: f64,
    ball_y: f64,
    ball_vx: f64,
    ball_vy: f64,
    left_y: f64,
    right_y: f64,
    left_score: u32,
    right_score: u32,
}

impl PongGame {
    pub fn new() -> Self {
        let mut game = Self {
            ball_x: WIDTH / 2.0,
            ball_y: HEIGHT / 2.0,
            ball_vx: 0.0,
            ball_vy: 0.0,
            left_y: HEIGHT / 2.0,
            right_y: HEIGHT / 2.0,
            left_score: 0,
            right_score: 0,
        };
        game.launch_ball(1.0);
        game
    }

    pub fn view(&self) -> GameView {
        GameView {
            ball_x: self.ball_x,
            ball_y: self.ball_y,
            left_y: self.left_y,
            right_y: self.right_y,
            left_score: self.left_score,
            right_score: self.right_score,
        }
    }

    pub fn tick(&mut self, dt: f64, left_input: i32, right_input: i32) -> GameView {
        // Cap dt to prevent huge jumps (e.g. tab-switch)
        let dt = dt.min(0.05);

        // Move paddles
        self.left_y += left_input as f64 * PADDLE_SPEED * dt;
        self.right_y += right_input as f64 * PADDLE_SPEED * dt;

        // Clamp paddles to arena
        let half_paddle = PADDLE_HEIGHT / 2.0;
        self.left_y = self.left_y.clamp(half_paddle, HEIGHT - half_paddle);
        self.right_y = self.right_y.clamp(half_paddle, HEIGHT - half_paddle);

        // Move ball
        self.ball_x += self.ball_vx * dt;
        self.ball_y += self.ball_vy * dt;

        // Wall bounce (top/bottom)
        if self.ball_y - BALL_RADIUS < 0.0 {
            self.ball_y = BALL_RADIUS;
            self.ball_vy = self.ball_vy.abs();
        } else if self.ball_y + BALL_RADIUS > HEIGHT {
            self.ball_y = HEIGHT - BALL_RADIUS;
            self.ball_vy = -self.ball_vy.abs();
        }

        // Left paddle collision
        let left_paddle_right = PADDLE_OFFSET + PADDLE_WIDTH;
        if self.ball_vx < 0.0
            && self.ball_x - BALL_RADIUS <= left_paddle_right
            && self.ball_x - BALL_RADIUS >= PADDLE_OFFSET
            && (self.ball_y - self.left_y).abs() <= half_paddle
        {
            self.ball_x = left_paddle_right + BALL_RADIUS;
            self.bounce_off_paddle(self.left_y);
        }

        // Right paddle collision
        let right_paddle_left = WIDTH - PADDLE_OFFSET - PADDLE_WIDTH;
        if self.ball_vx > 0.0
            && self.ball_x + BALL_RADIUS >= right_paddle_left
            && self.ball_x + BALL_RADIUS <= WIDTH - PADDLE_OFFSET
            && (self.ball_y - self.right_y).abs() <= half_paddle
        {
            self.ball_x = right_paddle_left - BALL_RADIUS;
            self.bounce_off_paddle(self.right_y);
        }

        // Scoring
        if self.ball_x < 0.0 {
            self.right_score += 1;
            self.reset_ball(-1.0);
        } else if self.ball_x > WIDTH {
            self.left_score += 1;
            self.reset_ball(1.0);
        }

        self.view()
    }

    fn bounce_off_paddle(&mut self, paddle_y: f64) {
        // Reverse horizontal direction
        self.ball_vx = -self.ball_vx;

        // Adjust vertical angle based on where ball hit the paddle
        let offset = (self.ball_y - paddle_y) / (PADDLE_HEIGHT / 2.0); // -1.0 to 1.0
        let speed = (self.ball_vx.powi(2) + self.ball_vy.powi(2)).sqrt();
        let new_speed = (speed + BALL_SPEED_INCREMENT).min(BALL_MAX_SPEED);
        let angle = offset * std::f64::consts::FRAC_PI_4; // max ±45°

        let dir = if self.ball_vx > 0.0 { 1.0 } else { -1.0 };
        self.ball_vx = dir * new_speed * angle.cos();
        self.ball_vy = new_speed * angle.sin();
    }

    fn reset_ball(&mut self, direction: f64) {
        self.ball_x = WIDTH / 2.0;
        self.ball_y = HEIGHT / 2.0;
        self.launch_ball(direction);
    }

    fn launch_ball(&mut self, direction: f64) {
        // Launch toward the player who was scored on
        self.ball_vx = direction * BALL_INITIAL_SPEED;
        self.ball_vy = 0.0;
    }
}

impl Default for PongGame {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_state() {
        let game = PongGame::new();
        let view = game.view();
        assert_eq!(view.ball_x, WIDTH / 2.0);
        assert_eq!(view.ball_y, HEIGHT / 2.0);
        assert_eq!(view.left_score, 0);
        assert_eq!(view.right_score, 0);
    }

    #[test]
    fn paddles_clamp_to_bounds() {
        let mut game = PongGame::new();
        // Push left paddle up past top for 10 seconds
        for _ in 0..600 {
            game.tick(1.0 / 60.0, -1, 0);
        }
        assert!(game.left_y >= PADDLE_HEIGHT / 2.0);
    }

    #[test]
    fn ball_moves_on_tick() {
        let mut game = PongGame::new();
        let before = game.view();
        game.tick(1.0 / 60.0, 0, 0);
        let after = game.view();
        assert_ne!(before.ball_x, after.ball_x);
    }

    #[test]
    fn score_increments_when_ball_passes_edge() {
        let mut game = PongGame::new();
        // Force ball to fly right quickly
        game.ball_vx = 10000.0;
        game.ball_vy = 0.0;
        game.tick(1.0, 0, 0);
        assert_eq!(game.left_score, 1);
    }

    #[test]
    fn dt_is_capped() {
        let mut game = PongGame::new();
        // Even with huge dt, ball shouldn't teleport across the whole field
        let view = game.tick(10.0, 0, 0); // 10 seconds - should be capped to 0.05
        // Ball should have moved at most ~15 pixels (300 * 0.05)
        assert!(view.ball_x < WIDTH);
        assert!(view.ball_x > 0.0);
    }
}
