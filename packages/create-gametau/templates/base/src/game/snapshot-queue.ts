export interface SnapshotQueueOptions {
  maxRetries?: number;
  backoffMs?: number;
  onError?: (error: unknown, retriesLeft: number) => void;
}

export function createSnapshotQueue<T>(
  save: (snapshot: T) => Promise<void>,
  options?: SnapshotQueueOptions,
): { enqueue(snapshot: T): void } {
  const maxRetries = options?.maxRetries ?? 3;
  const baseBackoffMs = options?.backoffMs ?? 500;
  const onError = options?.onError;

  let snapshotInFlight = false;
  let pendingSnapshot: T | null = null;

  async function flush(): Promise<void> {
    if (snapshotInFlight) return;
    snapshotInFlight = true;
    try {
      while (pendingSnapshot !== null) {
        const snapshot = pendingSnapshot;
        pendingSnapshot = null;

        let lastError: unknown;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            await save(snapshot);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            const retriesLeft = maxRetries - attempt;
            onError?.(error, retriesLeft);
            if (retriesLeft > 0) {
              const delayMs = baseBackoffMs * 2 ** attempt;
              await new Promise((r) => setTimeout(r, delayMs));
            }
          }
        }

        if (lastError !== null && lastError !== undefined) {
          // All retries exhausted for this snapshot; continue draining
          // pending queue so newer snapshots are not blocked.
        }
      }
    } finally {
      snapshotInFlight = false;
      if (pendingSnapshot !== null) {
        void flush();
      }
    }
  }

  return {
    enqueue(snapshot: T): void {
      pendingSnapshot = snapshot;
      void flush();
    },
  };
}
