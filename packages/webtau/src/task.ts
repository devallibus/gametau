/**
 * webtau/task — Long-running task lifecycle API.
 *
 * Provides startTask/pollTask/cancelTask for non-blocking backend operations.
 * Tasks are tracked internally; progress/completion are driven by invoke()
 * resolution and the structured diagnostic envelope from diagnostics.ts.
 *
 * ```ts
 * import { startTask, pollTask, cancelTask } from "webtau/task";
 *
 * const taskId = await startTask("process_save_data", { slot: 1 });
 * const status = await pollTask(taskId);
 * if (status.state === "completed") console.log(status.result);
 * ```
 */

import { invoke } from "./core";
import { WebtauError } from "./diagnostics";

// ── Public types ────────────────────────────────────────────────────────────

export interface TaskProgress {
  /** Completion percentage (0–100). Should be monotonically non-decreasing. */
  percent: number;
  /** Optional human-readable status message. */
  message?: string;
}

export type TaskState<T> =
  | { state: "running"; progress?: TaskProgress }
  | { state: "completed"; result: T }
  | { state: "cancelled" }
  | { state: "failed"; error: WebtauError };

export interface StartTaskOptions {
  /**
   * Called when cancelTask() is invoked for this task.
   * Use this to propagate cancellation to the backend, e.g. by invoking
   * a cancel command or aborting an in-flight request.
   *
   * ```ts
   * const taskId = await startTask("heavy_op", { slot: 1 }, {
   *   onCancel: () => invoke("cancel_heavy_op", { taskId }),
   * });
   * ```
   */
  onCancel?: () => void | Promise<void>;
}

// ── Internal task registry ──────────────────────────────────────────────────

interface TaskEntry<T> {
  status: TaskState<T>;
  cancelled: boolean;
  onCancel?: () => void | Promise<void>;
}

const taskRegistry = new Map<string, TaskEntry<unknown>>();
let nextTaskId = 1;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Start a long-running backend task without blocking the caller.
 *
 * Launches `command` via invoke() and returns a taskId immediately.
 * Use pollTask(taskId) to query current state and cancelTask(taskId) to
 * signal cancellation before the task completes.
 *
 * The optional `options.onCancel` callback is invoked when cancelTask()
 * is called, allowing the consumer to propagate cancellation to the
 * backend (e.g. by invoking a cancel command).
 */
export async function startTask<T>(
  command: string,
  args?: Record<string, unknown>,
  options?: StartTaskOptions,
): Promise<string> {
  const taskId = `task-${nextTaskId++}`;
  const entry: TaskEntry<T> = {
    status: { state: "running" },
    cancelled: false,
    onCancel: options?.onCancel,
  };
  taskRegistry.set(taskId, entry as TaskEntry<unknown>);

  invoke<T>(command, args).then(
    (result) => {
      const current = taskRegistry.get(taskId);
      if (current && !current.cancelled) {
        current.status = { state: "completed", result } as TaskState<unknown>;
      }
    },
    (err) => {
      const current = taskRegistry.get(taskId);
      if (!current) return;
      if (current.cancelled) {
        current.status = { state: "cancelled" };
      } else {
        const webtauErr =
          err instanceof WebtauError
            ? err
            : new WebtauError({
                code: "PROVIDER_ERROR",
                runtime: "unknown",
                command,
                message: err instanceof Error ? err.message : String(err),
                hint: "Check the command implementation for errors.",
              });
        current.status = { state: "failed", error: webtauErr } as TaskState<unknown>;
      }
    },
  );

  return taskId;
}

/**
 * Poll the current state of a task without blocking.
 *
 * Returns a Promise that resolves immediately with the current TaskState.
 * Terminal states (completed, cancelled, failed) are permanent.
 */
export async function pollTask<T>(taskId: string): Promise<TaskState<T>> {
  const entry = taskRegistry.get(taskId);
  if (!entry) {
    throw new WebtauError({
      code: "UNKNOWN_COMMAND",
      runtime: "unknown",
      command: taskId,
      message: `[webtau] No task with id "${taskId}".`,
      hint: "Ensure startTask() was called and the taskId is correct.",
    });
  }
  return entry.status as TaskState<T>;
}

/**
 * Signal cancellation for a running task.
 *
 * Idempotent: calling multiple times on the same taskId is safe.
 * If the task has already completed, this is a no-op.
 * If the task has not yet completed, the status transitions to "cancelled"
 * and any future invoke() resolution is ignored.
 *
 * If `onCancel` was provided in startTask options, it is called to
 * propagate cancellation to the backend. This ensures the backend
 * can stop ongoing work rather than continuing to mutate state.
 */
export async function cancelTask(taskId: string): Promise<void> {
  const entry = taskRegistry.get(taskId);
  if (!entry) return;
  if (entry.cancelled) return;

  entry.cancelled = true;
  if (entry.status.state === "running") {
    entry.status = { state: "cancelled" };
  }

  if (entry.onCancel) {
    await entry.onCancel();
  }
}

/**
 * Update the progress of a running task.
 * Useful for providers or test helpers that push intermediate progress.
 * No-ops if the task is not in "running" state.
 */
export function updateTaskProgress(taskId: string, progress: TaskProgress): void {
  const entry = taskRegistry.get(taskId);
  if (!entry || entry.status.state !== "running") return;
  entry.status = { state: "running", progress };
}

/** Clears all tracked tasks. Intended for test isolation. */
export function resetTasks(): void {
  taskRegistry.clear();
  nextTaskId = 1;
}
