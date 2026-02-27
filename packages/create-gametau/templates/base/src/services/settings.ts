import { createDir, exists, readTextFile, writeTextFile } from "webtau/fs";
import { appConfigDir, join } from "webtau/path";
import {
  DEFAULT_RUNTIME_SETTINGS,
  type RuntimeSettings,
  type SettingsService,
} from "./contracts";

const SETTINGS_FILENAME = "runtime-settings.json";

function normalizeSettings(raw: unknown): RuntimeSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_RUNTIME_SETTINGS;
  }
  const candidate = raw as Partial<RuntimeSettings>;
  const tickRateHz =
    typeof candidate.tickRateHz === "number" && Number.isFinite(candidate.tickRateHz)
      ? Math.max(1, Math.floor(candidate.tickRateHz))
      : DEFAULT_RUNTIME_SETTINGS.tickRateHz;
  const autoSaveEveryTicks =
    typeof candidate.autoSaveEveryTicks === "number" && Number.isFinite(candidate.autoSaveEveryTicks)
      ? Math.max(1, Math.floor(candidate.autoSaveEveryTicks))
      : DEFAULT_RUNTIME_SETTINGS.autoSaveEveryTicks;
  const commsChannel =
    typeof candidate.commsChannel === "string" && candidate.commsChannel.trim().length > 0
      ? candidate.commsChannel.trim()
      : DEFAULT_RUNTIME_SETTINGS.commsChannel;

  return { tickRateHz, autoSaveEveryTicks, commsChannel };
}

async function getSettingsPath(): Promise<string> {
  const configDir = await appConfigDir();
  await createDir(configDir, { recursive: true });
  return join(configDir, SETTINGS_FILENAME);
}

export function createSettingsService(): SettingsService {
  let cache: RuntimeSettings | null = null;

  return {
    async load(): Promise<RuntimeSettings> {
      if (cache) return cache;

      const settingsPath = await getSettingsPath();
      if (!(await exists(settingsPath))) {
        cache = DEFAULT_RUNTIME_SETTINGS;
        return cache;
      }

      try {
        const raw = await readTextFile(settingsPath);
        cache = normalizeSettings(JSON.parse(raw) as unknown);
      } catch {
        cache = DEFAULT_RUNTIME_SETTINGS;
      }
      return cache;
    },

    async save(next: Partial<RuntimeSettings>): Promise<RuntimeSettings> {
      const current = await this.load();
      const merged = normalizeSettings({ ...current, ...next });
      const settingsPath = await getSettingsPath();
      await writeTextFile(settingsPath, JSON.stringify(merged, null, 2));
      cache = merged;
      return merged;
    },
  };
}
