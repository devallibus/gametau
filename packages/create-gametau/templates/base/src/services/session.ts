import { createDir, exists, readTextFile, writeTextFile } from "webtau/fs";
import { appDataDir, join } from "webtau/path";
import type { SessionService, SessionSnapshot } from "./contracts";
import type { WorldView } from "./backend";

const SESSION_FILENAME = "mission-session.json";

function toSnapshot(view: WorldView): SessionSnapshot {
  return {
    ...view,
    savedAt: new Date().toISOString(),
  };
}

function parseSnapshot(raw: unknown): SessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SessionSnapshot>;
  if (
    typeof candidate.score !== "number" ||
    typeof candidate.tick_count !== "number" ||
    typeof candidate.savedAt !== "string"
  ) {
    return null;
  }
  return {
    score: candidate.score,
    tick_count: candidate.tick_count,
    savedAt: candidate.savedAt,
  };
}

async function getSessionPath(): Promise<string> {
  const dataDir = await appDataDir();
  await createDir(dataDir, { recursive: true });
  return join(dataDir, SESSION_FILENAME);
}

export function createSessionService(): SessionService {
  return {
    async loadLastSnapshot(): Promise<SessionSnapshot | null> {
      const sessionPath = await getSessionPath();
      if (!(await exists(sessionPath))) {
        return null;
      }
      try {
        const raw = await readTextFile(sessionPath);
        return parseSnapshot(JSON.parse(raw) as unknown);
      } catch {
        return null;
      }
    },

    async saveSnapshot(view: WorldView): Promise<void> {
      const sessionPath = await getSessionPath();
      const snapshot = toSnapshot(view);
      await writeTextFile(sessionPath, JSON.stringify(snapshot, null, 2));
    },
  };
}
