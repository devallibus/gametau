use serde::Serialize;

pub const WIDTH: f64 = 640.0;
pub const HEIGHT: f64 = 640.0;

#[derive(Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ThreatClass {
    Low,
    Med,
    High,
    Critical,
}

#[derive(Serialize, Clone)]
pub struct ContactView {
    pub id: u32,
    pub x: f64,
    pub y: f64,
    pub threat: ThreatClass,
    pub progress: f64,
    pub selected: bool,
}

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MissionState {
    Active,
    Failed,
}

#[derive(Serialize, Clone)]
pub struct MissionView {
    pub tick: u64,
    pub score: i32,
    pub integrity: i32,
    pub alerts: u32,
    pub mission_state: MissionState,
    pub contacts: Vec<ContactView>,
    pub selected_contact_id: Option<u32>,
}

#[derive(Serialize, Clone)]
pub struct DispatchResult {
    pub success: bool,
    pub summary: String,
    pub score_delta: i32,
}

#[derive(Clone)]
struct Contact {
    id: u32,
    angle: f64,
    orbit_radius: f64,
    angular_velocity: f64,
    threat: ThreatClass,
    progress: f64,
}

pub struct BattlestationSim {
    tick: u64,
    score: i32,
    integrity: i32,
    alerts: u32,
    mission_state: MissionState,
    selected_index: usize,
    contacts: Vec<Contact>,
}

fn threat_pressure(threat: ThreatClass) -> f64 {
    match threat {
        ThreatClass::Low => 0.05,
        ThreatClass::Med => 0.08,
        ThreatClass::High => 0.12,
        ThreatClass::Critical => 0.16,
    }
}

fn threat_damage(threat: ThreatClass) -> i32 {
    match threat {
        ThreatClass::Low => 2,
        ThreatClass::Med => 4,
        ThreatClass::High => 6,
        ThreatClass::Critical => 10,
    }
}

fn threat_reward(threat: ThreatClass) -> i32 {
    match threat {
        ThreatClass::Low => 4,
        ThreatClass::Med => 8,
        ThreatClass::High => 12,
        ThreatClass::Critical => 18,
    }
}

fn threat_label(threat: ThreatClass) -> &'static str {
    match threat {
        ThreatClass::Low => "LOW",
        ThreatClass::Med => "MED",
        ThreatClass::High => "HIGH",
        ThreatClass::Critical => "CRITICAL",
    }
}

fn escalate(threat: ThreatClass) -> ThreatClass {
    match threat {
        ThreatClass::Low => ThreatClass::Med,
        ThreatClass::Med => ThreatClass::High,
        ThreatClass::High => ThreatClass::Critical,
        ThreatClass::Critical => ThreatClass::Critical,
    }
}

fn deescalate(threat: ThreatClass) -> ThreatClass {
    match threat {
        ThreatClass::Low => ThreatClass::Low,
        ThreatClass::Med => ThreatClass::Low,
        ThreatClass::High => ThreatClass::Med,
        ThreatClass::Critical => ThreatClass::High,
    }
}

impl BattlestationSim {
    pub fn new() -> Self {
        Self {
            tick: 0,
            score: 0,
            integrity: 100,
            alerts: 0,
            mission_state: MissionState::Active,
            selected_index: 0,
            contacts: vec![
                Contact {
                    id: 11,
                    angle: 0.2,
                    orbit_radius: 120.0,
                    angular_velocity: 0.45,
                    threat: ThreatClass::Med,
                    progress: 0.1,
                },
                Contact {
                    id: 17,
                    angle: 1.5,
                    orbit_radius: 180.0,
                    angular_velocity: -0.35,
                    threat: ThreatClass::Low,
                    progress: 0.05,
                },
                Contact {
                    id: 23,
                    angle: 3.1,
                    orbit_radius: 220.0,
                    angular_velocity: 0.2,
                    threat: ThreatClass::High,
                    progress: 0.2,
                },
                Contact {
                    id: 31,
                    angle: 4.0,
                    orbit_radius: 160.0,
                    angular_velocity: 0.5,
                    threat: ThreatClass::Low,
                    progress: 0.0,
                },
            ],
        }
    }

    fn update_integrity(&mut self, delta: i32) {
        self.integrity = (self.integrity + delta).clamp(0, 100);
        if self.integrity == 0 {
            self.mission_state = MissionState::Failed;
        }
    }

    pub fn view(&self) -> MissionView {
        let center_x = WIDTH / 2.0;
        let center_y = HEIGHT / 2.0;
        let contacts = self
            .contacts
            .iter()
            .enumerate()
            .map(|(index, contact)| ContactView {
                id: contact.id,
                x: center_x + contact.angle.cos() * contact.orbit_radius,
                y: center_y + contact.angle.sin() * contact.orbit_radius,
                threat: contact.threat,
                progress: contact.progress.clamp(0.0, 1.0),
                selected: index == self.selected_index,
            })
            .collect();

        MissionView {
            tick: self.tick,
            score: self.score,
            integrity: self.integrity,
            alerts: self.alerts,
            mission_state: self.mission_state,
            contacts,
            selected_contact_id: self.contacts.get(self.selected_index).map(|c| c.id),
        }
    }

    pub fn tick(&mut self, dt: f64) -> MissionView {
        if self.mission_state == MissionState::Failed {
            return self.view();
        }

        let dt = dt.clamp(0.0, 0.2);
        self.tick += 1;
        let mut pending_alerts: u32 = 0;
        let mut pending_score: i32 = 0;
        let mut pending_integrity_delta: i32 = 0;

        for contact in &mut self.contacts {
            contact.angle += contact.angular_velocity * dt;
            if contact.angle > std::f64::consts::TAU {
                contact.angle -= std::f64::consts::TAU;
            } else if contact.angle < 0.0 {
                contact.angle += std::f64::consts::TAU;
            }

            contact.progress += threat_pressure(contact.threat) * dt;
            if contact.progress >= 1.0 {
                contact.progress = 0.25;
                pending_alerts += 1;
                pending_score -= 5;
                pending_integrity_delta -= threat_damage(contact.threat);
            }
        }

        self.alerts += pending_alerts;
        self.score += pending_score;
        if pending_integrity_delta != 0 {
            self.update_integrity(pending_integrity_delta);
        }

        // Deterministic escalation pulse every ~4 seconds at 10Hz.
        let mut escalation_alerts: u32 = 0;
        if self.tick % 40 == 0 {
            let idx = ((self.tick / 40) as usize) % self.contacts.len();
            let contact = &mut self.contacts[idx];
            contact.threat = escalate(contact.threat);
            escalation_alerts += 1;
        }
        self.alerts += escalation_alerts;

        self.view()
    }

    pub fn cycle_target(&mut self, direction: i32) -> MissionView {
        if self.contacts.is_empty() {
            return self.view();
        }
        let step = if direction >= 0 { 1 } else { -1 };
        let len = self.contacts.len() as i32;
        let current = self.selected_index as i32;
        self.selected_index = (current + step).rem_euclid(len) as usize;
        self.view()
    }

    pub fn dispatch_support(&mut self) -> DispatchResult {
        if self.mission_state == MissionState::Failed {
            return DispatchResult {
                success: false,
                summary: "Dispatch denied: battlestation integrity is compromised.".to_string(),
                score_delta: 0,
            };
        }

        let (success, summary, score_delta, integrity_delta) = {
            let contact = &mut self.contacts[self.selected_index];
            if contact.progress > 0.92 {
                (
                    false,
                    format!(
                        "Dispatch missed target #{} ({} threat) during terminal approach.",
                        contact.id,
                        threat_label(contact.threat)
                    ),
                    -4,
                    -4,
                )
            } else {
                let reward = threat_reward(contact.threat);
                contact.progress = (contact.progress - 0.65).max(0.0);
                contact.threat = deescalate(contact.threat);
                (
                    true,
                    format!(
                        "Support dispatch resolved pressure on target #{} ({}).",
                        contact.id,
                        threat_label(contact.threat)
                    ),
                    reward,
                    0,
                )
            }
        };

        if integrity_delta < 0 {
            self.alerts += 1;
            self.update_integrity(integrity_delta);
        } else if success {
            self.alerts += 1;
            self.score += score_delta;
        }

        DispatchResult {
            success,
            summary,
            score_delta,
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
    fn initializes_with_contacts_and_selected_target() {
        let sim = BattlestationSim::new();
        let view = sim.view();
        assert_eq!(view.mission_state, MissionState::Active);
        assert_eq!(view.contacts.len(), 4);
        assert_eq!(view.selected_contact_id, Some(11));
    }

    #[test]
    fn cycling_target_wraps_around() {
        let mut sim = BattlestationSim::new();
        sim.cycle_target(-1);
        assert_eq!(sim.view().selected_contact_id, Some(31));
    }

    #[test]
    fn dispatch_changes_score_or_integrity() {
        let mut sim = BattlestationSim::new();
        let before = sim.view();
        let outcome = sim.dispatch_support();
        let after = sim.view();
        assert_ne!(before.score, after.score);
        assert!(outcome.summary.contains("target"));
    }

    #[test]
    fn integrity_drops_on_unhandled_progress() {
        let mut sim = BattlestationSim::new();
        sim.contacts[0].progress = 0.99;
        let before = sim.view().integrity;
        sim.tick(0.2);
        let after = sim.view().integrity;
        assert!(after < before);
    }
}
