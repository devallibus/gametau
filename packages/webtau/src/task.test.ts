import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  cancelTask,
  pollTask,
  resetTasks,
  startTask,
  updateTaskProgress,
} from "./task";
import { WebtauError } from "./diagnostics";
import { configure, registerProvider, resetProvider } from "./core";
import type { CoreProvider } from "./provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flush all pending microtasks and one macrotask turn.
 * Needed because startTask fires invoke() without awaiting it, so state
 * transitions happen asynchronously across multiple microtask ticks.
 */
function flushPromises(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  resetTasks();
  resetProvider();
});

afterEach(() => {
  resetTasks();
  resetProvider();
});

// ---------------------------------------------------------------------------
// startTask — task creation and initial state
// ---------------------------------------------------------------------------

describe("startTask", () => {
  test("returns a non-empty taskId string immediately", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}), // never resolves
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("long_op");
    expect(typeof taskId).toBe("string");
    expect(taskId.length).toBeGreaterThan(0);
  });

  test("task starts in running state", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("long_op");
    const status = await pollTask(taskId);
    expect(status.state).toBe("running");
  });

  test("sequential startTask calls produce unique taskIds", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const id1 = await startTask("op");
    const id2 = await startTask("op");
    const id3 = await startTask("op");
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

// ---------------------------------------------------------------------------
// pollTask — state transitions
// ---------------------------------------------------------------------------

describe("pollTask", () => {
  test("throws WebtauError for unknown taskId", async () => {
    try {
      await pollTask("nonexistent-task-id");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(WebtauError);
      const e = err as WebtauError;
      expect(e.code).toBe("UNKNOWN_COMMAND");
      expect(e.message).toContain("nonexistent-task-id");
    }
  });

  test("transitions to completed when invoke resolves", async () => {
    let resolve!: (v: { score: number }) => void;
    const promise = new Promise<{ score: number }>((res) => { resolve = res; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask<{ score: number }>("get_score");
    expect((await pollTask(taskId)).state).toBe("running");

    resolve({ score: 42 });
    await flushPromises();

    const status = await pollTask<{ score: number }>(taskId);
    expect(status.state).toBe("completed");
    if (status.state === "completed") {
      expect(status.result).toEqual({ score: 42 });
    }
  });

  test("transitions to failed with WebtauError when invoke rejects", async () => {
    let reject!: (e: Error) => void;
    const promise = new Promise<never>((_, rej) => { reject = rej; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("failing_op");
    reject(new Error("backend exploded"));

    await flushPromises();

    const status = await pollTask(taskId);
    expect(status.state).toBe("failed");
    if (status.state === "failed") {
      expect(status.error).toBeInstanceOf(WebtauError);
      expect(status.error.message).toContain("backend exploded");
    }
  });

  test("completed state is permanent — does not revert", async () => {
    let resolve!: (v: number) => void;
    const promise = new Promise<number>((res) => { resolve = res; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask<number>("op");
    resolve(99);
    await flushPromises();

    const s1 = await pollTask<number>(taskId);
    const s2 = await pollTask<number>(taskId);
    expect(s1).toEqual(s2);
    expect(s1.state).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// cancelTask — cancellation idempotency and precision
// ---------------------------------------------------------------------------

describe("cancelTask", () => {
  test("cancels a running task immediately", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("slow_op");
    await cancelTask(taskId);

    const status = await pollTask(taskId);
    expect(status.state).toBe("cancelled");
  });

  test("cancellation is idempotent — calling twice does not throw", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("slow_op");
    await expect(cancelTask(taskId)).resolves.toBeUndefined();
    await expect(cancelTask(taskId)).resolves.toBeUndefined();

    const status = await pollTask(taskId);
    expect(status.state).toBe("cancelled");
  });

  test("cancelling an unknown taskId is a no-op (does not throw)", async () => {
    await expect(cancelTask("nonexistent")).resolves.toBeUndefined();
  });

  test("cancelled state persists even when invoke eventually resolves", async () => {
    let resolve!: (v: string) => void;
    const promise = new Promise<string>((res) => { resolve = res; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask<string>("op");
    await cancelTask(taskId);
    resolve("too late");
    await flushPromises();

    const status = await pollTask(taskId);
    expect(status.state).toBe("cancelled");
  });

  test("cancelling an already-completed task is a no-op", async () => {
    let resolve!: (v: number) => void;
    const promise = new Promise<number>((res) => { resolve = res; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask<number>("op");
    resolve(1);
    await flushPromises();

    await cancelTask(taskId);
    const status = await pollTask<number>(taskId);
    expect(status.state).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// updateTaskProgress — progress monotonicity
// ---------------------------------------------------------------------------

describe("updateTaskProgress", () => {
  test("updates progress on a running task", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("long_op");
    updateTaskProgress(taskId, { percent: 25, message: "Loading…" });

    const status = await pollTask(taskId);
    expect(status.state).toBe("running");
    if (status.state === "running") {
      expect(status.progress?.percent).toBe(25);
      expect(status.progress?.message).toBe("Loading…");
    }
  });

  test("progress updates reflect monotonic increases", async () => {
    registerProvider({
      id: "mock",
      invoke: () => new Promise(() => {}),
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("op");
    updateTaskProgress(taskId, { percent: 10 });
    const s1 = await pollTask(taskId);

    updateTaskProgress(taskId, { percent: 50 });
    const s2 = await pollTask(taskId);

    updateTaskProgress(taskId, { percent: 100 });
    const s3 = await pollTask(taskId);

    const p1 = s1.state === "running" ? s1.progress?.percent ?? 0 : -1;
    const p2 = s2.state === "running" ? s2.progress?.percent ?? 0 : -1;
    const p3 = s3.state === "running" ? s3.progress?.percent ?? 0 : -1;

    expect(p1).toBeLessThanOrEqual(p2);
    expect(p2).toBeLessThanOrEqual(p3);
  });

  test("updateTaskProgress is a no-op on a completed task", async () => {
    let resolve!: (v: number) => void;
    const promise = new Promise<number>((res) => { resolve = res; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask<number>("op");
    resolve(42);
    await flushPromises();

    updateTaskProgress(taskId, { percent: 99 });
    const status = await pollTask<number>(taskId);
    expect(status.state).toBe("completed");
  });
});

// ---------------------------------------------------------------------------
// Error envelope propagation
// ---------------------------------------------------------------------------

describe("error envelope propagation", () => {
  test("WebtauError from invoke propagates to task state", async () => {
    let reject!: (e: WebtauError) => void;
    const promise = new Promise<never>((_, rej) => { reject = rej; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("failing");
    reject(
      new WebtauError({
        code: "PROVIDER_ERROR",
        runtime: "wasm",
        command: "failing",
        message: "command failed with structured error",
        hint: "Check args",
      }),
    );

    await flushPromises();

    const status = await pollTask(taskId);
    expect(status.state).toBe("failed");
    if (status.state === "failed") {
      expect(status.error).toBeInstanceOf(WebtauError);
      expect(status.error.code).toBe("PROVIDER_ERROR");
      expect(status.error.command).toBe("failing");
    }
  });

  test("plain Error from invoke is wrapped in WebtauError with PROVIDER_ERROR code", async () => {
    let reject!: (e: Error) => void;
    const promise = new Promise<never>((_, rej) => { reject = rej; });

    registerProvider({
      id: "mock",
      invoke: async () => promise,
      convertFileSrc: (p) => p,
    });

    const taskId = await startTask("op");
    reject(new Error("plain error message"));
    await flushPromises();

    const status = await pollTask(taskId);
    expect(status.state).toBe("failed");
    if (status.state === "failed") {
      expect(status.error).toBeInstanceOf(WebtauError);
      expect(status.error.code).toBe("PROVIDER_ERROR");
      expect(status.error.message).toContain("plain error message");
    }
  });
});
