import { invoke } from "webtau";

export type EnemyType = "RED_CUBE" | "HEAVY_RED_CUBE" | "ALIEN_8_BIT";

export interface ContactView {
  id: number;
  x: number;
  y: number;
  enemy_type: EnemyType;
  hp: number;
  max_hp: number;
  progress: number;
  selected: boolean;
}

export interface MissionView {
  tick: number;
  score: number;
  integrity: number;
  alerts: number;
  wave: number;
  mission_state: "ACTIVE" | "FAILED";
  contacts: ContactView[];
  selected_contact_id: number | null;
}

export interface FireResult {
  hit: boolean;
  killed: boolean;
  summary: string;
  score_delta: number;
}

export const getMissionView = () => invoke<MissionView>("get_mission_view");

export const tickMission = (dt: number) => invoke<MissionView>("tick", { dt });

export const cycleTarget = (direction: number) =>
  invoke<MissionView>("cycle_target", { direction });

export const fireAt = (x: number, y: number) =>
  invoke<FireResult>("fire_at", { x, y });

export const fireShot = () => invoke<FireResult>("fire_shot");
