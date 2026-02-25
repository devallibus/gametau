import { invoke } from "webtau";

export interface GameView {
  ball_x: number;
  ball_y: number;
  left_y: number;
  right_y: number;
  left_score: number;
  right_score: number;
}

export const getState = () => invoke<GameView>("get_state");

export const tick = (dt: number, left_input: number, right_input: number) =>
  invoke<GameView>("tick", { dt, left_input, right_input });
