import { invoke } from "webtau";
import { startTask, pollTask, cancelTask } from "webtau/task";
import type { TaskState } from "webtau/task";

export interface WorldView {
  score: number;
  tick_count: number;
}

export interface TickResult {
  score_delta: number;
}

export interface ProcessResult {
  processed: number;
}

export async function getWorldView(): Promise<WorldView> {
  return invoke<WorldView>("get_world_view");
}

export async function tickWorld(): Promise<TickResult> {
  return invoke<TickResult>("tick_world");
}

// ── Long-running task seam ──────────────────────────────────────────────────
// Reference flow proving non-blocking start/poll/cancel behavior for heavy
// backend operations across web (WASM) and desktop (Tauri) runtimes.

export async function startWorldProcessing(args: { batchSize: number }): Promise<string> {
  return startTask<ProcessResult>("process_world_batch", args);
}

export async function pollWorldTask(taskId: string): Promise<TaskState<ProcessResult>> {
  return pollTask<ProcessResult>(taskId);
}

export async function cancelWorldTask(taskId: string): Promise<void> {
  return cancelTask(taskId);
}
