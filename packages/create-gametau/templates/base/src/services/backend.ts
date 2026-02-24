import { invoke } from "webtau";

export interface WorldView {
  score: number;
  tick_count: number;
}

export interface TickResult {
  score_delta: number;
}

export async function getWorldView(): Promise<WorldView> {
  return invoke<WorldView>("get_world_view");
}

export async function tickWorld(): Promise<TickResult> {
  return invoke<TickResult>("tick_world");
}
