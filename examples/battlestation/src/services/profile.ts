import { createDir, exists, readTextFile, writeTextFile } from "webtau/fs";
import { appDataDir, join } from "webtau/path";
import type { MissionView } from "./backend";

export interface OperatorProfile {
  muted: boolean;
  masterVolume: number;
  missionsRun: number;
  bestScore: number;
  lastIntegrity: number;
}

const PROFILE_FILE = "battlestation-profile.json";

const DEFAULT_PROFILE: OperatorProfile = {
  muted: false,
  masterVolume: 0.7,
  missionsRun: 0,
  bestScore: 0,
  lastIntegrity: 100,
};

function normalizeProfile(raw: unknown): OperatorProfile {
  if (!raw || typeof raw !== "object") return DEFAULT_PROFILE;
  const candidate = raw as Partial<OperatorProfile>;
  return {
    muted: !!candidate.muted,
    masterVolume:
      typeof candidate.masterVolume === "number"
        ? Math.max(0, Math.min(1, candidate.masterVolume))
        : DEFAULT_PROFILE.masterVolume,
    missionsRun:
      typeof candidate.missionsRun === "number" && Number.isFinite(candidate.missionsRun)
        ? Math.max(0, Math.floor(candidate.missionsRun))
        : DEFAULT_PROFILE.missionsRun,
    bestScore:
      typeof candidate.bestScore === "number" && Number.isFinite(candidate.bestScore)
        ? Math.max(0, Math.floor(candidate.bestScore))
        : DEFAULT_PROFILE.bestScore,
    lastIntegrity:
      typeof candidate.lastIntegrity === "number" && Number.isFinite(candidate.lastIntegrity)
        ? Math.max(0, Math.min(100, Math.floor(candidate.lastIntegrity)))
        : DEFAULT_PROFILE.lastIntegrity,
  };
}

async function profilePath(): Promise<string> {
  const base = await appDataDir();
  await createDir(base, { recursive: true });
  return join(base, PROFILE_FILE);
}

export async function loadOperatorProfile(): Promise<OperatorProfile> {
  const path = await profilePath();
  if (!(await exists(path))) return DEFAULT_PROFILE;
  try {
    const content = await readTextFile(path);
    return normalizeProfile(JSON.parse(content) as unknown);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveOperatorProfile(profile: OperatorProfile): Promise<void> {
  const path = await profilePath();
  await writeTextFile(path, JSON.stringify(profile, null, 2));
}

export async function recordMissionOutcome(
  profile: OperatorProfile,
  view: MissionView,
): Promise<OperatorProfile> {
  const nextProfile: OperatorProfile = {
    ...profile,
    missionsRun: profile.missionsRun + 1,
    bestScore: Math.max(profile.bestScore, view.score),
    lastIntegrity: view.integrity,
  };
  await saveOperatorProfile(nextProfile);
  return nextProfile;
}
