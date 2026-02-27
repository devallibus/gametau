import { describe, test, expect, mock } from "bun:test";
import { createSnapshotQueue } from "../templates/base/src/game/snapshot-queue";

/**
 * Helper: create a deferred promise so tests can control when save resolves.
 */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flush the microtask queue so enqueued promises settle. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("snapshot-queue", () => {
  test("coalesces N enqueues into final write", async () => {
    const saved: number[] = [];
    const queue = createSnapshotQueue<number>(async (snapshot) => {
      saved.push(snapshot);
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);
    queue.enqueue(5);

    // Let the single flush cycle complete
    await tick();

    // Only the last-enqueued value before the first save started (1) and
    // the last value written after the drain loop picks up pending (5).
    // At most 2 saves: the first picked up before any were coalesced,
    // and the coalesced tail.
    expect(saved.length).toBeLessThanOrEqual(2);
    expect(saved[saved.length - 1]).toBe(5);
  });

  test("does not overlap writes (snapshotInFlight guard)", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const d = deferred();

    const queue = createSnapshotQueue<string>(async (snapshot) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      if (snapshot === "first") {
        await d.promise;
      }
      concurrent--;
    });

    queue.enqueue("first");
    await tick();

    // Enqueue while first save is still in-flight
    queue.enqueue("second");
    await tick();

    // Release the first save
    d.resolve();
    await tick();

    expect(maxConcurrent).toBe(1);
  });

  test("retries under capped policy", async () => {
    let callCount = 0;
    const queue = createSnapshotQueue<string>(
      async () => {
        callCount++;
        throw new Error("save failed");
      },
      { maxRetries: 2, backoffMs: 1 },
    );

    queue.enqueue("fail-me");
    // Wait for retries to exhaust (3 attempts: initial + 2 retries)
    await new Promise((r) => setTimeout(r, 50));

    // initial attempt + 2 retries = 3 total
    expect(callCount).toBe(3);
  });

  test("exponential backoff timing", async () => {
    const timestamps: number[] = [];
    const queue = createSnapshotQueue<string>(
      async () => {
        timestamps.push(performance.now());
        throw new Error("save failed");
      },
      { maxRetries: 2, backoffMs: 20 },
    );

    queue.enqueue("timing");
    await new Promise((r) => setTimeout(r, 200));

    expect(timestamps.length).toBe(3);
    // Gap between attempt 0→1 should be ~20ms, between 1→2 should be ~40ms
    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];
    expect(gap1).toBeGreaterThanOrEqual(15);
    expect(gap2).toBeGreaterThan(gap1 * 1.3);
  });

  test("succeeds after transient failure", async () => {
    let attempt = 0;
    const saved: string[] = [];

    const queue = createSnapshotQueue<string>(
      async (snapshot) => {
        attempt++;
        if (attempt === 1) throw new Error("transient");
        saved.push(snapshot);
      },
      { maxRetries: 2, backoffMs: 1 },
    );

    queue.enqueue("recover");
    await new Promise((r) => setTimeout(r, 50));

    expect(saved).toEqual(["recover"]);
  });

  test("calls onError callback with error and retriesLeft", async () => {
    const errors: Array<{ error: unknown; retriesLeft: number }> = [];

    const queue = createSnapshotQueue<string>(
      async () => {
        throw new Error("boom");
      },
      {
        maxRetries: 2,
        backoffMs: 1,
        onError: (error, retriesLeft) => {
          errors.push({ error, retriesLeft });
        },
      },
    );

    queue.enqueue("observe");
    await new Promise((r) => setTimeout(r, 50));

    expect(errors.length).toBe(3);
    expect(errors[0].retriesLeft).toBe(2);
    expect(errors[1].retriesLeft).toBe(1);
    expect(errors[2].retriesLeft).toBe(0);
    expect((errors[0].error as Error).message).toBe("boom");
  });
});
