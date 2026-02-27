use serde::Serialize;

pub const WIDTH: f64 = 640.0;
pub const HEIGHT: f64 = 640.0;
const CENTER_X: f64 = WIDTH / 2.0;
const CENTER_Y: f64 = HEIGHT / 2.0;
const MAX_ENEMIES: usize = 8;
const INITIAL_SPAWN_INTERVAL: u64 = 30;

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EnemyType {
    RedCube,
    HeavyRedCube,
    Alien8Bit,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MissionState {
    Active,
    Failed,
}

#[derive(Serialize, Clone)]
pub struct ContactView {
    pub id: u32,
    pub x: f64,
    pub y: f64,
    pub enemy_type: EnemyType,
    pub hp: i32,
    pub max_hp: i32,
    pub progress: f64,
    pub selected: bool,
}

#[derive(Serialize, Clone)]
pub struct MissionView {
    pub tick: u64,
    pub score: i32,
    pub integrity: i32,
    pub alerts: u32,
    pub wave: u32,
    pub mission_state: MissionState,
    pub contacts: Vec<ContactView>,
    pub selected_contact_id: Option<u32>,
}

#[derive(Serialize, Clone)]
pub struct FireResult {
    pub hit: bool,
    pub killed: bool,
    pub summary: String,
    pub score_delta: i32,
}

#[derive(Clone)]
struct Enemy {
    id: u32,
    enemy_type: EnemyType,
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    hp: i32,
    progress: f64,
    total_dist: f64,
}

pub struct BattlestationSim {
    tick: u64,
    score: i32,
    integrity: i32,
    alerts: u32,
    mission_state: MissionState,
    selected_index: usize,
    enemies: Vec<Enemy>,
    next_id: u32,
    spawn_timer: u64,
    wave: u32,
}

// --- Archetype helpers ---

fn archetype_speed(t: EnemyType) -> f64 {
    match t {
        EnemyType::RedCube => 30.0,
        EnemyType::HeavyRedCube => 18.0,
        EnemyType::Alien8Bit => 24.0,
    }
}

fn archetype_max_hp(t: EnemyType) -> i32 {
    match t {
        EnemyType::RedCube => 1,
        EnemyType::HeavyRedCube => 3,
        EnemyType::Alien8Bit => 2,
    }
}

fn archetype_damage(t: EnemyType) -> i32 {
    match t {
        EnemyType::RedCube => 4,
        EnemyType::HeavyRedCube => 10,
        EnemyType::Alien8Bit => 6,
    }
}

fn archetype_reward(t: EnemyType) -> i32 {
    match t {
        EnemyType::RedCube => 5,
        EnemyType::HeavyRedCube => 12,
        EnemyType::Alien8Bit => 8,
    }
}

fn archetype_label(t: EnemyType) -> &'static str {
    match t {
        EnemyType::RedCube => "RED_CUBE",
        EnemyType::HeavyRedCube => "HEAVY_RED_CUBE",
        EnemyType::Alien8Bit => "ALIEN_8_BIT",
    }
}

/// Project an angle to a point on the 640x640 border.
fn edge_point(angle: f64) -> (f64, f64) {
    let cos = angle.cos();
    let sin = angle.sin();
    // Cast a ray from center to border; find first intersection with rectangle.
    let half_w = WIDTH / 2.0;
    let half_h = HEIGHT / 2.0;
    let scale = if cos.abs() < 1e-9 {
        half_h / sin.abs()
    } else if sin.abs() < 1e-9 {
        half_w / cos.abs()
    } else {
        (half_w / cos.abs()).min(half_h / sin.abs())
    };
    let x = (CENTER_X + cos * scale).clamp(0.0, WIDTH);
    let y = (CENTER_Y + sin * scale).clamp(0.0, HEIGHT);
    (x, y)
}

impl BattlestationSim {
    pub fn new() -> Self {
        let mut sim = Self {
            tick: 0,
            score: 0,
            integrity: 100,
            alerts: 0,
            mission_state: MissionState::Active,
            selected_index: 0,
            enemies: Vec::new(),
            next_id: 1,
            spawn_timer: 0,
            wave: 1,
        };
        // Initial wave: 2 RedCube + 1 Alien8Bit
        sim.spawn_enemy(EnemyType::RedCube);
        sim.spawn_enemy(EnemyType::RedCube);
        sim.spawn_enemy(EnemyType::Alien8Bit);
        sim
    }

    fn spawn_enemy(&mut self, enemy_type: EnemyType) {
        if self.enemies.len() >= MAX_ENEMIES {
            return;
        }
        // Golden-angle distribution for spread-out spawns.
        let golden_angle = 2.399_963_229_728_653; // π * (3 - √5)
        let angle = self.next_id as f64 * golden_angle;
        let (sx, sy) = edge_point(angle);
        let dx = CENTER_X - sx;
        let dy = CENTER_Y - sy;
        let dist = (dx * dx + dy * dy).sqrt();
        let speed = archetype_speed(enemy_type);
        let (vx, vy) = if dist > 0.0 {
            (dx / dist * speed, dy / dist * speed)
        } else {
            (0.0, 0.0)
        };

        self.enemies.push(Enemy {
            id: self.next_id,
            enemy_type,
            x: sx,
            y: sy,
            vx,
            vy,
            hp: archetype_max_hp(enemy_type),
            progress: 0.0,
            total_dist: dist,
        });
        self.next_id += 1;
    }

    fn update_integrity(&mut self, delta: i32) {
        self.integrity = (self.integrity + delta).clamp(0, 100);
        if self.integrity == 0 {
            self.mission_state = MissionState::Failed;
        }
    }

    fn clamp_selected(&mut self) {
        if self.enemies.is_empty() {
            self.selected_index = 0;
        } else if self.selected_index >= self.enemies.len() {
            self.selected_index = self.enemies.len() - 1;
        }
    }

    pub fn view(&self) -> MissionView {
        let contacts = self
            .enemies
            .iter()
            .enumerate()
            .map(|(index, enemy)| ContactView {
                id: enemy.id,
                x: enemy.x,
                y: enemy.y,
                enemy_type: enemy.enemy_type,
                hp: enemy.hp,
                max_hp: archetype_max_hp(enemy.enemy_type),
                progress: enemy.progress.clamp(0.0, 1.0),
                selected: index == self.selected_index,
            })
            .collect();

        MissionView {
            tick: self.tick,
            score: self.score,
            integrity: self.integrity,
            alerts: self.alerts,
            wave: self.wave,
            mission_state: self.mission_state,
            contacts,
            selected_contact_id: self.enemies.get(self.selected_index).map(|e| e.id),
        }
    }

    pub fn tick(&mut self, dt: f64) -> MissionView {
        if self.mission_state == MissionState::Failed {
            return self.view();
        }

        let dt = dt.clamp(0.0, 0.2);
        self.tick += 1;

        // --- Move enemies toward center ---
        for enemy in &mut self.enemies {
            enemy.x += enemy.vx * dt;
            enemy.y += enemy.vy * dt;
            // Update progress based on distance traveled
            if enemy.total_dist > 0.0 {
                let dx = CENTER_X - enemy.x;
                let dy = CENTER_Y - enemy.y;
                let remaining = (dx * dx + dy * dy).sqrt();
                enemy.progress = 1.0 - (remaining / enemy.total_dist).clamp(0.0, 1.0);
            }
        }

        // --- Arrival detection: enemies that reached center ---
        let mut pending_integrity_delta: i32 = 0;
        let mut pending_alerts: u32 = 0;
        self.enemies.retain(|enemy| {
            let dx = CENTER_X - enemy.x;
            let dy = CENTER_Y - enemy.y;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist < 12.0 {
                // Arrived at base
                pending_integrity_delta -= archetype_damage(enemy.enemy_type);
                pending_alerts += 1;
                false
            } else {
                true
            }
        });

        self.alerts += pending_alerts;
        if pending_integrity_delta != 0 {
            self.update_integrity(pending_integrity_delta);
        }
        self.clamp_selected();

        // --- Wave spawner ---
        self.spawn_timer += 1;
        // Spawn interval decreases over time (min 10 ticks)
        let interval = INITIAL_SPAWN_INTERVAL.saturating_sub(self.wave as u64 * 2).max(10);
        if self.spawn_timer >= interval && self.enemies.len() < MAX_ENEMIES {
            self.spawn_timer = 0;
            // Archetype distribution shifts toward heavier enemies over time
            let enemy_type = match self.wave {
                1..=2 => EnemyType::RedCube,
                3..=4 => {
                    if self.tick % 3 == 0 {
                        EnemyType::Alien8Bit
                    } else {
                        EnemyType::RedCube
                    }
                }
                5..=7 => {
                    if self.tick % 4 == 0 {
                        EnemyType::HeavyRedCube
                    } else if self.tick % 2 == 0 {
                        EnemyType::Alien8Bit
                    } else {
                        EnemyType::RedCube
                    }
                }
                _ => {
                    if self.tick % 3 == 0 {
                        EnemyType::HeavyRedCube
                    } else if self.tick % 2 == 0 {
                        EnemyType::Alien8Bit
                    } else {
                        EnemyType::RedCube
                    }
                }
            };
            self.spawn_enemy(enemy_type);
        }

        // --- Wave counter: advance every 100 ticks ---
        if self.tick % 100 == 0 {
            self.wave += 1;
        }

        self.view()
    }

    pub fn cycle_target(&mut self, direction: i32) -> MissionView {
        if self.enemies.is_empty() {
            return self.view();
        }
        let step = if direction >= 0 { 1 } else { -1 };
        let len = self.enemies.len() as i32;
        let current = self.selected_index as i32;
        self.selected_index = (current + step).rem_euclid(len) as usize;
        self.view()
    }

    /// Fire an orbital strike at position (x, y). Hits the closest enemy
    /// within blast radius, or misses if nothing is nearby.
    pub fn fire_at(&mut self, x: f64, y: f64) -> FireResult {
        if self.mission_state == MissionState::Failed {
            return FireResult {
                hit: false,
                killed: false,
                summary: "Fire denied: defense integrity is compromised.".to_string(),
                score_delta: 0,
            };
        }

        if self.enemies.is_empty() {
            return FireResult {
                hit: false,
                killed: false,
                summary: "No targets in range.".to_string(),
                score_delta: 0,
            };
        }

        // Find closest enemy to (x, y)
        let blast_radius = 40.0;
        let mut best_idx: Option<usize> = None;
        let mut best_dist = f64::MAX;
        for (i, enemy) in self.enemies.iter().enumerate() {
            let dx = enemy.x - x;
            let dy = enemy.y - y;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist < blast_radius && dist < best_dist {
                best_dist = dist;
                best_idx = Some(i);
            }
        }

        let Some(idx) = best_idx else {
            self.alerts += 1;
            return FireResult {
                hit: false,
                killed: false,
                summary: "Strike missed — no hostile at impact site.".to_string(),
                score_delta: 0,
            };
        };

        let enemy = &mut self.enemies[idx];
        enemy.hp -= 1;
        let enemy_id = enemy.id;
        let enemy_type = enemy.enemy_type;
        let killed = enemy.hp <= 0;

        if killed {
            let reward = archetype_reward(enemy_type);
            self.score += reward;
            self.alerts += 1;
            self.enemies.remove(idx);
            self.clamp_selected();
            FireResult {
                hit: true,
                killed: true,
                summary: format!(
                    "Target #{} ({}) destroyed. +{} points.",
                    enemy_id,
                    archetype_label(enemy_type),
                    reward
                ),
                score_delta: reward,
            }
        } else {
            self.alerts += 1;
            FireResult {
                hit: true,
                killed: false,
                summary: format!(
                    "Hit on target #{} ({}). {} HP remaining.",
                    enemy_id,
                    archetype_label(enemy_type),
                    self.enemies[idx].hp
                ),
                score_delta: 0,
            }
        }
    }

    pub fn fire_shot(&mut self) -> FireResult {
        if self.mission_state == MissionState::Failed {
            return FireResult {
                hit: false,
                killed: false,
                summary: "Fire denied: defense integrity is compromised.".to_string(),
                score_delta: 0,
            };
        }

        if self.enemies.is_empty() {
            return FireResult {
                hit: false,
                killed: false,
                summary: "No targets in range.".to_string(),
                score_delta: 0,
            };
        }

        let enemy = &mut self.enemies[self.selected_index];
        enemy.hp -= 1;
        let enemy_id = enemy.id;
        let enemy_type = enemy.enemy_type;
        let killed = enemy.hp <= 0;

        if killed {
            let reward = archetype_reward(enemy_type);
            self.score += reward;
            self.alerts += 1;
            self.enemies.remove(self.selected_index);
            self.clamp_selected();
            FireResult {
                hit: true,
                killed: true,
                summary: format!(
                    "Target #{} ({}) destroyed. +{} points.",
                    enemy_id,
                    archetype_label(enemy_type),
                    reward
                ),
                score_delta: reward,
            }
        } else {
            self.alerts += 1;
            FireResult {
                hit: true,
                killed: false,
                summary: format!(
                    "Hit on target #{} ({}). {} HP remaining.",
                    enemy_id,
                    archetype_label(enemy_type),
                    self.enemies[self.selected_index].hp
                ),
                score_delta: 0,
            }
        }
    }
}

impl Default for BattlestationSim {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initializes_with_enemies_and_selected_target() {
        let sim = BattlestationSim::new();
        let view = sim.view();
        assert_eq!(view.mission_state, MissionState::Active);
        assert_eq!(view.contacts.len(), 3);
        assert_eq!(view.wave, 1);
        assert!(view.selected_contact_id.is_some());
    }

    #[test]
    fn cycling_target_wraps_around() {
        let mut sim = BattlestationSim::new();
        // 3 enemies, starting at index 0 -> wrap backwards to index 2
        sim.cycle_target(-1);
        let view = sim.view();
        assert_eq!(view.selected_contact_id, Some(sim.enemies[2].id));
    }

    #[test]
    fn fire_shot_kills_single_hp_enemy() {
        let mut sim = BattlestationSim::new();
        // First enemy is RedCube with 1 HP
        assert_eq!(sim.enemies[0].enemy_type, EnemyType::RedCube);
        let result = sim.fire_shot();
        assert!(result.hit);
        assert!(result.killed);
        assert_eq!(result.score_delta, 5);
        // Enemy removed
        assert_eq!(sim.enemies.len(), 2);
    }

    #[test]
    fn fire_shot_multi_hit_on_heavy_enemy() {
        let mut sim = BattlestationSim::new();
        // Select the Alien8Bit (index 2, HP=2)
        sim.cycle_target(1);
        sim.cycle_target(1);
        assert_eq!(sim.enemies[sim.selected_index].enemy_type, EnemyType::Alien8Bit);

        let r1 = sim.fire_shot();
        assert!(r1.hit);
        assert!(!r1.killed);
        assert_eq!(r1.score_delta, 0);

        let r2 = sim.fire_shot();
        assert!(r2.hit);
        assert!(r2.killed);
        assert_eq!(r2.score_delta, 8);
    }

    #[test]
    fn integrity_drops_on_enemy_arrival() {
        let mut sim = BattlestationSim::new();
        // Teleport first enemy to center
        sim.enemies[0].x = CENTER_X;
        sim.enemies[0].y = CENTER_Y;
        let before = sim.view().integrity;
        sim.tick(0.1);
        let after = sim.view().integrity;
        assert!(after < before);
    }

    #[test]
    fn spawner_adds_enemies_over_time() {
        let mut sim = BattlestationSim::new();
        let initial = sim.enemies.len();
        // Run enough ticks for spawner to fire
        for _ in 0..40 {
            sim.tick(0.1);
        }
        assert!(sim.enemies.len() > initial);
    }

    #[test]
    fn wave_advances_after_100_ticks() {
        let mut sim = BattlestationSim::new();
        assert_eq!(sim.wave, 1);
        for _ in 0..100 {
            sim.tick(0.1);
        }
        assert!(sim.wave >= 2);
    }

    #[test]
    fn selected_index_clamped_after_removal() {
        let mut sim = BattlestationSim::new();
        // Select last enemy
        sim.selected_index = sim.enemies.len() - 1;
        let last_id = sim.enemies.last().unwrap().id;
        // Kill it
        sim.enemies[sim.selected_index].hp = 1;
        let result = sim.fire_shot();
        assert!(result.killed);
        // selected_index should be clamped
        assert!(sim.selected_index < sim.enemies.len());
        // Should not reference the removed enemy
        assert_ne!(sim.enemies.get(sim.selected_index).map(|e| e.id), Some(last_id));
    }

    #[test]
    fn happy_path_kill_enemy_and_score() {
        let mut sim = BattlestationSim::new();
        let view = sim.view();
        assert!(!view.contacts.is_empty(), "should start with enemies");
        assert_eq!(view.mission_state, MissionState::Active);

        let initial_score = view.score;
        // Fire at first enemy (RedCube, 1 HP) — should kill in one shot
        let result = sim.fire_shot();
        assert!(result.hit);
        assert!(result.killed);

        let view = sim.view();
        assert!(view.score > initial_score, "score should increase on kill");
    }

    #[test]
    fn failure_path_integrity_reaches_zero() {
        let mut sim = BattlestationSim::new();
        // Tick without firing — enemies will eventually reach center and damage integrity
        for _ in 0..5000 {
            sim.tick(0.1);
            let view = sim.view();
            if view.mission_state == MissionState::Failed {
                assert_eq!(view.integrity, 0);
                return;
            }
        }
        panic!("mission should have failed from enemy breaches within 5000 ticks");
    }

    #[test]
    fn cycle_target_wraps_forward_and_back() {
        let sim = BattlestationSim::new();
        let view = sim.view();
        assert!(view.contacts.len() >= 2, "need at least 2 enemies for cycling test");

        let mut sim = BattlestationSim::new();
        let initial_id = sim.view().selected_contact_id;

        sim.cycle_target(1);
        let after_forward = sim.view().selected_contact_id;
        assert_ne!(after_forward, initial_id, "target should change after cycling forward");

        sim.cycle_target(-1);
        let after_back = sim.view().selected_contact_id;
        assert_eq!(after_back, initial_id, "should wrap back to initial target");
    }

    #[test]
    fn fire_at_position_hits_nearby_enemy() {
        let mut sim = BattlestationSim::new();
        let view = sim.view();
        assert!(!view.contacts.is_empty());

        let target = &view.contacts[0];
        let result = sim.fire_at(target.x, target.y);
        assert!(result.hit, "should hit enemy at its exact position");
    }
}
