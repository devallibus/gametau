import { invoke } from "webtau";

export type ThreatClass = "LOW" | "MED" | "HIGH" | "CRITICAL";

export interface ContactView {
  id: number;
  x: number;
  y: number;
  threat: ThreatClass;
  progress: number;
  selected: boolean;
}

export interface MissionView {
  tick: number;
  score: number;
  integrity: number;
  alerts: number;
  mission_state: "ACTIVE" | "FAILED";
  contacts: ContactView[];
  selected_contact_id: number | null;
}

export interface DispatchResult {
  success: boolean;
  summary: string;
  score_delta: number;
}

export const getMissionView = () => invoke<MissionView>("get_mission_view");

export const tickMission = (dt: number) => invoke<MissionView>("tick", { dt });

export const cycleTarget = (direction: number) =>
  invoke<MissionView>("cycle_target", { direction });

export const dispatchSupport = () => invoke<DispatchResult>("dispatch_support");
